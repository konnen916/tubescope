import type { ChannelDataset } from '../types';
import { fetchChannelMeta, fetchAllVideoIds, fetchVideosByIds, type FetchJson } from './youtube-api';
import { computeVideoRows, computeChannelSummary } from './metrics';

export interface CollectDeps {
  apiKey: string;
  fetchJson: FetchJson;
}

export type ProgressCb = (fetched: number, total: number) => void;

export async function collectChannelDataset(
  deps: CollectDeps,
  channelId: string,
  onProgress?: ProgressCb,
): Promise<ChannelDataset> {
  const { apiKey, fetchJson } = deps;
  const channel = await fetchChannelMeta(fetchJson, apiKey, channelId);
  const total = channel.videoCount || 0;
  onProgress?.(0, total);
  const ids = await fetchAllVideoIds(fetchJson, apiKey, channel.uploadsPlaylistId, (count) => onProgress?.(count, total));
  const videos = await fetchVideosByIds(fetchJson, apiKey, ids, (c) => onProgress?.(c, ids.length));
  const rows = computeVideoRows(videos);
  const summary = computeChannelSummary(rows);
  return { channel, summary, videos: rows, generatedAt: new Date().toISOString() };
}
