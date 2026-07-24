import type { ChannelDataset, VideoRow } from '../types';
import { median } from './metrics';

export function viewsSkew(rows: VideoRow[]): number {
  if (rows.length === 0) return 0;
  const views = rows.map((r) => r.viewCount);
  const med = median(views);
  if (!med) return 0;
  const mean = views.reduce((a, b) => a + b, 0) / views.length;
  return mean / med;
}

export function consistencyCV(rows: VideoRow[]): number {
  if (rows.length === 0) return 0;
  const views = rows.map((r) => r.viewCount);
  const mean = views.reduce((a, b) => a + b, 0) / views.length;
  if (!mean) return 0;
  const variance = views.reduce((a, v) => a + (v - mean) ** 2, 0) / views.length;
  return Math.sqrt(variance) / mean;
}

export interface Bucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export function distributionBuckets(rows: VideoRow[], bucketCount = 6): Bucket[] {
  const views = rows.map((r) => r.viewCount).filter((v) => v >= 0);
  if (views.length === 0) return [];
  const max = Math.max(...views, 1);
  const logMax = Math.log10(max + 1);
  const edges: number[] = [];
  for (let i = 0; i <= bucketCount; i++) {
    edges.push(Math.round(10 ** ((logMax * i) / bucketCount) - 1));
  }
  const buckets: Bucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const min = edges[i];
    const hi = edges[i + 1];
    const last = i === bucketCount - 1;
    const count = views.filter((v) => v >= min && (last ? v <= hi : v < hi)).length;
    buckets.push({ label: `${min.toLocaleString()}–${hi.toLocaleString()}`, min, max: hi, count });
  }
  return buckets;
}

export function uploadsPerMonth(rows: VideoRow[]): number {
  if (rows.length < 2) return rows.length;
  const times = rows.map((r) => new Date(r.publishedAt).getTime());
  const span = Math.max(...times) - Math.min(...times);
  const months = span / (1000 * 60 * 60 * 24 * 30.44);
  return months > 0 ? rows.length / months : rows.length;
}

export interface DurationSplit {
  shorts: { count: number; medianViews: number };
  long: { count: number; medianViews: number };
}

export function durationSplit(rows: VideoRow[], thresholdSeconds = 60): DurationSplit {
  const shorts = rows.filter((r) => r.durationSeconds > 0 && r.durationSeconds < thresholdSeconds);
  const long = rows.filter((r) => r.durationSeconds >= thresholdSeconds);
  return {
    shorts: { count: shorts.length, medianViews: median(shorts.map((r) => r.viewCount)) },
    long: { count: long.length, medianViews: median(long.map((r) => r.viewCount)) },
  };
}

export function stripThumbnails(dataset: ChannelDataset): ChannelDataset {
  const clear = (v: VideoRow): VideoRow => ({ ...v, thumbnail: '' });
  return {
    ...dataset,
    channel: { ...dataset.channel, thumbnail: '' },
    videos: dataset.videos.map(clear),
    summary: {
      ...dataset.summary,
      topPerformers: dataset.summary.topPerformers.map(clear),
      bottomPerformers: dataset.summary.bottomPerformers.map(clear),
    },
  };
}
