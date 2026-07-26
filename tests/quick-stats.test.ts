import { it, expect } from 'vitest';
import { quickStats } from '../src/lib/quick-stats';
import type { RawVideo } from '../src/types';

function raw(over: Partial<RawVideo>): RawVideo {
  return {
    videoId: 'v', title: 't', publishedAt: '2026-01-01T00:00:00Z', viewCount: 0,
    likeCount: 0, commentCount: 0, durationSeconds: 0, definition: 'hd', caption: false,
    tags: [], categoryId: '', thumbnail: '', ...over,
  };
}

it('computes views/day, engagement, like ratio, age', () => {
  const now = new Date('2026-01-11T00:00:00Z'); // 10 days after publish
  const q = quickStats(raw({ viewCount: 1000, likeCount: 100, commentCount: 50 }), now);
  expect(q.ageDays).toBeCloseTo(10, 5);
  expect(q.viewsPerDay).toBeCloseTo(100, 5);
  expect(q.engagementRate).toBeCloseTo(0.15, 5); // (100+50)/1000
  expect(q.likeRatio).toBeCloseTo(0.1, 5);
});

it('guards zero views and floors age', () => {
  const now = new Date('2026-01-01T00:00:00Z'); // same instant as publish
  const q = quickStats(raw({ viewCount: 0 }), now);
  expect(q.engagementRate).toBe(0);
  expect(q.likeRatio).toBe(0);
  expect(q.ageDays).toBeGreaterThan(0); // floored, never 0
});
