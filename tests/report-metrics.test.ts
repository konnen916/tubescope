import { it, expect } from 'vitest';
import {
  viewsSkew, consistencyCV, distributionBuckets, uploadsPerMonth, durationSplit, stripThumbnails,
} from '../src/lib/report-metrics';
import type { VideoRow, ChannelDataset } from '../src/types';

function row(over: Partial<VideoRow>): VideoRow {
  return {
    videoId: 'v', title: 't', publishedAt: '2026-01-01T00:00:00Z', viewCount: 0,
    likeCount: 0, commentCount: 0, durationSeconds: 120, definition: 'hd', caption: false,
    tags: [], categoryId: '', thumbnail: 'thumb', ageDays: 1, viewsPerDay: 0,
    engagementRate: 0, likeRatio: 0, outlierScore: 0, ...over,
  };
}

it('viewsSkew is mean/median (>1 when hit-driven)', () => {
  const rows = [row({ viewCount: 10 }), row({ viewCount: 10 }), row({ viewCount: 1000 })];
  // median=10, mean=340 -> skew=34
  expect(viewsSkew(rows)).toBeCloseTo(34, 5);
  expect(viewsSkew([])).toBe(0);
});

it('consistencyCV is 0 when all views equal', () => {
  expect(consistencyCV([row({ viewCount: 100 }), row({ viewCount: 100 })])).toBeCloseTo(0, 5);
  expect(consistencyCV([])).toBe(0);
});

it('distributionBuckets returns bucketCount buckets whose counts sum to N', () => {
  const rows = [0, 5, 50, 500, 5000, 50000].map((v) => row({ viewCount: v }));
  const buckets = distributionBuckets(rows, 6);
  expect(buckets.length).toBe(6);
  expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(6);
});

it('uploadsPerMonth reflects cadence', () => {
  // two uploads ~1 month apart -> ~2 per month
  const rows = [row({ publishedAt: '2026-01-01T00:00:00Z' }), row({ publishedAt: '2026-02-01T00:00:00Z' })];
  expect(uploadsPerMonth(rows)).toBeGreaterThan(1.5);
  expect(uploadsPerMonth([row({})])).toBe(1);
});

it('durationSplit splits at 60s and reports median views per side', () => {
  const rows = [
    row({ durationSeconds: 30, viewCount: 100 }),
    row({ durationSeconds: 45, viewCount: 300 }),
    row({ durationSeconds: 600, viewCount: 50 }),
  ];
  const d = durationSplit(rows);
  expect(d.shorts.count).toBe(2);
  expect(d.shorts.medianViews).toBe(200);
  expect(d.long.count).toBe(1);
  expect(d.long.medianViews).toBe(50);
});

it('stripThumbnails clears every thumbnail field', () => {
  const ds: ChannelDataset = {
    channel: { id: 'UC1', title: 'c', description: '', publishedAt: '', subscriberCount: 0, totalViewCount: 0, videoCount: 1, uploadsPlaylistId: '', thumbnail: 'x' },
    summary: { videoCount: 1, totalViews: 0, medianViews: 0, meanViews: 0, avgUploadGapDays: null, bestDayOfWeek: null, bestHourUTC: null, topPerformers: [row({})], bottomPerformers: [row({})] },
    videos: [row({})],
    generatedAt: '2026-07-24T00:00:00Z',
  };
  const out = stripThumbnails(ds);
  expect(out.channel.thumbnail).toBe('');
  expect(out.videos[0].thumbnail).toBe('');
  expect(out.summary.topPerformers[0].thumbnail).toBe('');
});
