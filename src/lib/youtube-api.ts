import type { ChannelMeta, RawVideo } from '../types';

export type FetchJson = (url: string) => Promise<any>;
const BASE = 'https://www.googleapis.com/youtube/v3';

export function makeFetchJson(): FetchJson {
  return async (url: string) => {
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`);
    return body;
  };
}

function isoDurationToSeconds(iso: string): number {
  const m = iso.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

export async function fetchChannelMeta(fj: FetchJson, apiKey: string, channelId: string): Promise<ChannelMeta> {
  const url = `${BASE}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`;
  const data = await fj(url);
  const item = data.items?.[0];
  if (!item) throw new Error('Channel not found');
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description ?? '',
    publishedAt: item.snippet.publishedAt,
    subscriberCount: Number(item.statistics.subscriberCount ?? 0),
    totalViewCount: Number(item.statistics.viewCount ?? 0),
    videoCount: Number(item.statistics.videoCount ?? 0),
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    thumbnail: item.snippet.thumbnails?.default?.url ?? '',
    country: item.snippet.country,
  };
}

export async function fetchAllVideoIds(
  fj: FetchJson, apiKey: string, uploadsPlaylistId: string, onPage?: (count: number) => void,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = '';
  do {
    const url = `${BASE}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`;
    const data = await fj(url);
    for (const it of data.items ?? []) ids.push(it.contentDetails.videoId);
    pageToken = data.nextPageToken ?? '';
    onPage?.(ids.length);
  } while (pageToken);
  return ids;
}

export async function fetchVideosByIds(
  fj: FetchJson, apiKey: string, ids: string[], onBatch?: (count: number) => void,
): Promise<RawVideo[]> {
  const out: RawVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `${BASE}/videos?part=snippet,statistics,contentDetails&id=${batch.join(',')}&key=${apiKey}`;
    const data = await fj(url);
    for (const it of data.items ?? []) {
      out.push({
        videoId: it.id,
        title: it.snippet.title,
        publishedAt: it.snippet.publishedAt,
        viewCount: Number(it.statistics?.viewCount ?? 0),
        likeCount: Number(it.statistics?.likeCount ?? 0),
        commentCount: Number(it.statistics?.commentCount ?? 0),
        durationSeconds: isoDurationToSeconds(it.contentDetails?.duration ?? 'PT0S'),
        definition: it.contentDetails?.definition ?? 'sd',
        caption: it.contentDetails?.caption === 'true',
        tags: it.snippet?.tags ?? [],
        categoryId: it.snippet?.categoryId ?? '',
        thumbnail: it.snippet?.thumbnails?.medium?.url ?? '',
      });
    }
    onBatch?.(out.length);
  }
  return out;
}
