import { it, expect } from 'vitest';
import { median, computeVideoRows, computeChannelSummary } from '../src/lib/metrics';
import type { RawVideo } from '../src/types';

function raw(partial: Partial<RawVideo>): RawVideo {
  return {
    videoId: 'v', title: 't', publishedAt: '2026-01-01T00:00:00Z',
    viewCount: 0, likeCount: 0, commentCount: 0, durationSeconds: 0,
    definition: 'hd', caption: false, tags: [], categoryId: '', thumbnail: '',
    ...partial,
  };
}

it('median handles odd, even, empty', () => {
  expect(median([3, 1, 2])).toBe(2);
  expect(median([1, 2, 3, 4])).toBe(2.5);
  expect(median([])).toBe(0);
});

it('computes engagement and outlier vs median', () => {
  const now = new Date('2026-01-11T00:00:00Z'); // 10 days after publish
  const rows = computeVideoRows(
    [
      raw({ viewCount: 100, likeCount: 10, commentCount: 10 }),
      raw({ viewCount: 300, likeCount: 0, commentCount: 0 }),
    ],
    now,
  );
  expect(rows[0].engagementRate).toBeCloseTo(0.2, 5); // (10+10)/100
  expect(rows[0].viewsPerDay).toBeCloseTo(10, 5);      // 100 / 10 days
  expect(rows[0].outlierScore).toBeCloseTo(0.5, 5);    // 100 / median(100,300)=200
  expect(rows[1].outlierScore).toBeCloseTo(1.5, 5);
});

it('summary computes totals, best day, upload gap', () => {
  const rows = computeVideoRows([
    raw({ viewCount: 100, publishedAt: '2026-01-01T05:00:00Z' }), // Thursday
    raw({ viewCount: 300, publishedAt: '2026-01-08T05:00:00Z' }), // Thursday, +7 days
  ]);
  const s = computeChannelSummary(rows);
  expect(s.videoCount).toBe(2);
  expect(s.totalViews).toBe(400);
  expect(s.medianViews).toBe(200);
  expect(s.bestDayOfWeek).toBe('Thursday');
  expect(s.avgUploadGapDays).toBeCloseTo(7, 5);
  expect(s.topPerformers[0].viewCount).toBe(300);
});
