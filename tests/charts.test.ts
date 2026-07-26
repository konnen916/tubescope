import { it, expect } from 'vitest';
import { uploadTimelineSvg, viewsHistogramSvg, outlierBarsSvg, heatmapSvg } from '../src/lib/charts';
import type { VideoRow } from '../src/types';
import type { Bucket } from '../src/lib/report-metrics';

function row(over: Partial<VideoRow>): VideoRow {
  return {
    videoId: 'v', title: 't', publishedAt: '2026-01-01T00:00:00Z', viewCount: 100,
    likeCount: 0, commentCount: 0, durationSeconds: 120, definition: 'hd', caption: false,
    tags: [], categoryId: '', thumbnail: '', ageDays: 1, viewsPerDay: 0,
    engagementRate: 0, likeRatio: 0, outlierScore: 1, ...over,
  };
}

it('uploadTimelineSvg draws one mark per video and is an svg', () => {
  const svg = uploadTimelineSvg([row({}), row({ publishedAt: '2026-02-01T00:00:00Z' })]);
  expect(svg.startsWith('<svg')).toBe(true);
  expect((svg.match(/<circle/g) || []).length).toBe(2);
});

it('viewsHistogramSvg draws one bar per bucket', () => {
  const buckets: Bucket[] = [
    { label: '0–10', min: 0, max: 10, count: 3 },
    { label: '10–100', min: 10, max: 100, count: 1 },
  ];
  const svg = viewsHistogramSvg(buckets);
  expect((svg.match(/<rect/g) || []).length).toBe(2);
});

it('outlierBarsSvg respects topN and ESCAPES titles (XSS)', () => {
  const rows = [
    row({ title: '<script>alert(1)</script>', outlierScore: 9 }),
    row({ outlierScore: 5 }),
    row({ outlierScore: 1 }),
  ];
  const svg = outlierBarsSvg(rows, 2);
  expect((svg.match(/<rect/g) || []).length).toBe(2); // topN=2
  expect(svg).not.toContain('<script>alert(1)</script>');
  expect(svg).toContain('&lt;script&gt;');
});

it('heatmapSvg renders a 7x24 = 168-cell grid', () => {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  grid[4][5] = 200;
  const svg = heatmapSvg(grid);
  expect(svg.startsWith('<svg')).toBe(true);
  expect((svg.match(/<rect/g) || []).length).toBe(168);
});

it('heatmapSvg returns an empty-state svg for an empty grid', () => {
  const svg = heatmapSvg([]);
  expect(svg.startsWith('<svg')).toBe(true);
  expect((svg.match(/<rect/g) || []).length).toBe(0);
});

it('heatmapSvg renders day labels', () => {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(1));
  const svg = heatmapSvg(grid);
  expect(svg).toContain('Sun');
  expect(svg).toContain('Sat');
});

it('uploadTimelineSvg shows year labels and a value label', () => {
  const svg = uploadTimelineSvg([
    row({ publishedAt: '2026-01-01T00:00:00Z', viewCount: 1500000 }),
    row({ publishedAt: '2026-02-01T00:00:00Z', viewCount: 10 }),
  ]);
  expect(svg).toMatch(/<text/);
  expect(svg).toContain('2026');
  expect(svg).toContain('1.5M views');
});

it('viewsHistogramSvg prints counts and range labels and a Videos axis', () => {
  const buckets: Bucket[] = [
    { label: '0-10', min: 0, max: 10, count: 3 },
    { label: '10-100', min: 10, max: 100, count: 1 },
  ];
  const svg = viewsHistogramSvg(buckets);
  expect(svg).toContain('>3</text>');   // count above the bar
  expect(svg).toContain('0-10');        // compact range under the bar
  expect(svg).toContain('Videos');      // y-axis label
});

it('outlierBarsSvg draws a 2x reference line when the top score is >= 2', () => {
  const svg = outlierBarsSvg([row({ outlierScore: 9 }), row({ outlierScore: 1 })], 2);
  expect(svg).toContain('2× median'); // "2× median"
  expect(svg).toMatch(/stroke-dasharray/);
});

it('heatmapSvg shows hour ticks', () => {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(1));
  const svg = heatmapSvg(grid);
  expect(svg).toContain('12:00');
});
