import { it, expect } from 'vitest';
import { toCSV, toJSON, suggestFilename } from '../src/lib/exporter';
import type { ChannelDataset, VideoRow } from '../src/types';

function row(over: Partial<VideoRow>): VideoRow {
  return {
    videoId: 'v', title: 't', publishedAt: '2026-01-01T00:00:00Z', viewCount: 0,
    likeCount: 0, commentCount: 0, durationSeconds: 0, definition: 'hd', caption: false,
    tags: [], categoryId: '', thumbnail: '', ageDays: 1, viewsPerDay: 0,
    engagementRate: 0, likeRatio: 0, outlierScore: 0, ...over,
  };
}

function dataset(rows: VideoRow[]): ChannelDataset {
  return {
    channel: { id: 'UC1', title: 'My Channel!', description: '', publishedAt: '', subscriberCount: 0, totalViewCount: 0, videoCount: rows.length, uploadsPlaylistId: '', thumbnail: '' },
    summary: { videoCount: rows.length, totalViews: 0, medianViews: 0, meanViews: 0, avgUploadGapDays: null, bestDayOfWeek: null, bestHourUTC: null, topPerformers: [], bottomPerformers: [] },
    videos: rows,
    generatedAt: '2026-07-24T00:00:00Z',
  };
}

it('escapes commas, quotes, and newlines in CSV', () => {
  const csv = toCSV(dataset([row({ title: 'a,"b"\nc', tags: ['x', 'y'] })]));
  const lines = csv.split('\r\n');
  expect(lines[0]).toContain('videoId,title,publishedAt');
  expect(lines[1]).toContain('"a,""b""\nc"');
  expect(lines[1]).toContain('x|y'); // tags joined with pipe
});

it('neutralizes CSV formula injection in titles', () => {
  const csv = toCSV(dataset([row({ title: '=HYPERLINK("http://evil","x")' })]));
  const lines = csv.split('\r\n');
  expect(lines[1]).toContain("'=HYPERLINK");
});

it('JSON round-trips', () => {
  const ds = dataset([row({ viewCount: 5 })]);
  const parsed = JSON.parse(toJSON(ds));
  expect(parsed.videos[0].viewCount).toBe(5);
});

it('suggestFilename slugs the channel title', () => {
  expect(suggestFilename(dataset([]), 'csv')).toBe('tubescope-my-channel-20260724.csv');
});
