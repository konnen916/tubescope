import { it, expect, vi } from 'vitest';
import {
  makeFetchJson, fetchChannelMeta, fetchAllVideoIds, fetchVideosByIds, type FetchJson,
} from '../src/lib/youtube-api';

it('fetchChannelMeta maps fields and reads uploads playlist', async () => {
  const fj: FetchJson = async () => ({
    items: [{
      id: 'UC1', snippet: { title: 'Chan', description: 'd', publishedAt: '2020-01-01T00:00:00Z', thumbnails: { default: { url: 'u' } }, country: 'US' },
      statistics: { subscriberCount: '10', viewCount: '999', videoCount: '2' },
      contentDetails: { relatedPlaylists: { uploads: 'UU1' } },
    }],
  });
  const meta = await fetchChannelMeta(fj, 'k', 'UC1');
  expect(meta.uploadsPlaylistId).toBe('UU1');
  expect(meta.subscriberCount).toBe(10);
  expect(meta.videoCount).toBe(2);
});

it('fetchChannelMeta throws when channel missing', async () => {
  const fj: FetchJson = async () => ({ items: [] });
  await expect(fetchChannelMeta(fj, 'k', 'UCx')).rejects.toThrow('Channel not found');
});

it('fetchAllVideoIds paginates', async () => {
  const pages = [
    { items: [{ contentDetails: { videoId: 'a' } }, { contentDetails: { videoId: 'b' } }], nextPageToken: 'p2' },
    { items: [{ contentDetails: { videoId: 'c' } }] },
  ];
  let i = 0;
  const fj: FetchJson = async () => pages[i++];
  const ids = await fetchAllVideoIds(fj, 'k', 'UU1');
  expect(ids).toEqual(['a', 'b', 'c']);
});

it('fetchVideosByIds batches in groups of 50', async () => {
  const ids = Array.from({ length: 51 }, (_, n) => 'id' + n);
  const calls: string[] = [];
  const fj: FetchJson = async (url) => {
    calls.push(url);
    return { items: [{ id: 'x', snippet: { title: 't', publishedAt: '2026-01-01T00:00:00Z', tags: ['g'], categoryId: '1', thumbnails: { medium: { url: 'm' } } }, statistics: { viewCount: '5', likeCount: '1', commentCount: '2' }, contentDetails: { duration: 'PT1M30S', definition: 'hd', caption: 'true' } }] };
  };
  const vids = await fetchVideosByIds(fj, 'k', ids);
  expect(calls.length).toBe(2); // 50 + 1
  expect(vids[0].durationSeconds).toBe(90);
  expect(vids[0].caption).toBe(true);
  expect(vids[0].tags).toEqual(['g']);
});

it('parses ISO-8601 durations with a day component', async () => {
  const fj: FetchJson = async () => ({ items: [{ id: 'x', snippet: { title: 't', publishedAt: '2026-01-01T00:00:00Z' }, statistics: { viewCount: '1' }, contentDetails: { duration: 'P1DT2H3M4S' } }] });
  const vids = await fetchVideosByIds(fj, 'k', ['x']);
  expect(vids[0].durationSeconds).toBe(93784); // 1d2h3m4s
});

it('makeFetchJson surfaces API error message', async () => {
  vi.stubGlobal('fetch', async () => ({
    ok: false, status: 403, json: async () => ({ error: { message: 'quota exceeded' } }),
  }));
  const fj = makeFetchJson();
  await expect(fj('http://x')).rejects.toThrow('quota exceeded');
  vi.unstubAllGlobals();
});
