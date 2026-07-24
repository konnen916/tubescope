import { it, expect, vi } from 'vitest';
import { collectChannelDataset } from '../src/lib/collect';
import type { FetchJson } from '../src/lib/youtube-api';

const fj: FetchJson = async (url) => {
  if (url.includes('/channels?')) return { items: [{ id: 'UC1', snippet: { title: 'Chan', description: '', publishedAt: '2020-01-01T00:00:00Z', thumbnails: {} }, statistics: { subscriberCount: '1', viewCount: '10', videoCount: '1' }, contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] };
  if (url.includes('/playlistItems?')) return { items: [{ contentDetails: { videoId: 'v1' } }] };
  if (url.includes('/videos?')) return { items: [{ id: 'v1', snippet: { title: 'V', publishedAt: '2026-01-01T00:00:00Z' }, statistics: { viewCount: '10', likeCount: '1', commentCount: '1' }, contentDetails: { duration: 'PT1M', definition: 'hd', caption: 'false' } }] };
  return {};
};

it('assembles dataset and reports progress', async () => {
  const progress = vi.fn();
  const ds = await collectChannelDataset({ apiKey: 'k', fetchJson: fj }, 'UC1', progress);
  expect(ds.channel.title).toBe('Chan');
  expect(ds.videos.length).toBe(1);
  expect(ds.summary.videoCount).toBe(1);
  expect(typeof ds.generatedAt).toBe('string');
  expect(progress).toHaveBeenCalled();
  expect(progress).toHaveBeenLastCalledWith(1, 1);
});
