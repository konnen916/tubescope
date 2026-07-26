import { it, expect } from 'vitest';
import { bestTimeHeatmap, topTags, winningTitleWords, velocityLeaders } from '../src/lib/report-insights';
import type { VideoRow } from '../src/types';

function row(over: Partial<VideoRow>): VideoRow {
  return {
    videoId: 'v', title: 't', publishedAt: '2026-01-01T00:00:00Z', viewCount: 0,
    likeCount: 0, commentCount: 0, durationSeconds: 120, definition: 'hd', caption: false,
    tags: [], categoryId: '', thumbnail: '', ageDays: 1, viewsPerDay: 0,
    engagementRate: 0, likeRatio: 0, outlierScore: 1, ...over,
  };
}

it('bestTimeHeatmap is 7x24 and cells are the slot average', () => {
  // 2026-01-01T05:xx:00Z is Thursday (UTC day 4), hour 5
  const grid = bestTimeHeatmap([
    row({ publishedAt: '2026-01-01T05:00:00Z', viewCount: 100 }),
    row({ publishedAt: '2026-01-01T05:30:00Z', viewCount: 300 }),
  ]);
  expect(grid.length).toBe(7);
  expect(grid[0].length).toBe(24);
  expect(grid[4][5]).toBe(200); // avg of 100 and 300
  expect(grid[0][0]).toBe(0);   // empty slot
});

it('topTags ranks by frequency desc and respects limit', () => {
  const tags = topTags([row({ tags: ['a', 'b'] }), row({ tags: ['a'] }), row({ tags: ['a', 'c'] })], 2);
  expect(tags[0]).toEqual({ tag: 'a', count: 3 });
  expect(tags.length).toBe(2);
});

it('winningTitleWords uses top-outlier titles, drops stopwords and short tokens', () => {
  const words = winningTitleWords([
    row({ title: 'The Insane Minecraft Build', outlierScore: 9 }),
    row({ title: 'Insane Minecraft Trap', outlierScore: 8 }),
    row({ title: 'boring vlog day', outlierScore: 0.5 }),
  ], 2, 10);
  const map = Object.fromEntries(words.map((w) => [w.word, w.count]));
  expect(map['insane']).toBe(2);
  expect(map['minecraft']).toBe(2);
  expect(map['the']).toBeUndefined();    // stopword removed
  expect(map['boring']).toBeUndefined(); // not among the top-2 outliers
});

it('velocityLeaders sorts by viewsPerDay desc with limit', () => {
  const top = velocityLeaders([row({ viewsPerDay: 5 }), row({ viewsPerDay: 50 }), row({ viewsPerDay: 20 })], 2);
  expect(top[0].viewsPerDay).toBe(50);
  expect(top.length).toBe(2);
});

it('winningTitleWords tokenizes markup titles to injection-safe words', () => {
  const words = winningTitleWords([row({ title: '<img src=x onerror=alert(1)> hack', outlierScore: 9 })], 1, 10);
  for (const w of words) {
    expect(w.word).toMatch(/^[a-z0-9]+$/);
    expect(w.word.includes('<')).toBe(false);
    expect(w.word.includes('>')).toBe(false);
  }
  expect(words.some((w) => w.word === 'hack')).toBe(true);
});
