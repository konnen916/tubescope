import type { ChannelDataset, RawComment, VideoRow } from '../types';

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  // Neutralize spreadsheet formula injection: a leading =,+,-,@ (or control char)
  // can auto-execute when the CSV is opened in Excel/Sheets. Prefix a single quote.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const COLUMNS: { header: string; get: (r: VideoRow) => unknown }[] = [
  { header: 'videoId', get: (r) => r.videoId },
  { header: 'title', get: (r) => r.title },
  { header: 'publishedAt', get: (r) => r.publishedAt },
  { header: 'views', get: (r) => r.viewCount },
  { header: 'likes', get: (r) => r.likeCount },
  { header: 'comments', get: (r) => r.commentCount },
  { header: 'durationSeconds', get: (r) => r.durationSeconds },
  { header: 'definition', get: (r) => r.definition },
  { header: 'caption', get: (r) => r.caption },
  { header: 'tags', get: (r) => r.tags.join('|') },
  { header: 'categoryId', get: (r) => r.categoryId },
  { header: 'ageDays', get: (r) => r.ageDays.toFixed(2) },
  { header: 'viewsPerDay', get: (r) => r.viewsPerDay.toFixed(2) },
  { header: 'engagementRate', get: (r) => r.engagementRate.toFixed(5) },
  { header: 'likeRatio', get: (r) => r.likeRatio.toFixed(5) },
  { header: 'outlierScore', get: (r) => r.outlierScore.toFixed(3) },
];

export function toCSV(dataset: ChannelDataset): string {
  const head = COLUMNS.map((c) => c.header).join(',');
  const rows = dataset.videos.map((r) => COLUMNS.map((c) => csvCell(c.get(r))).join(','));
  return [head, ...rows].join('\r\n');
}

export function toJSON(dataset: ChannelDataset): string {
  return JSON.stringify(dataset, null, 2);
}

const COMMENT_COLUMNS: { header: string; get: (c: RawComment) => unknown }[] = [
  { header: 'commentId', get: (c) => c.commentId },
  { header: 'author', get: (c) => c.author },
  { header: 'text', get: (c) => c.text },
  { header: 'likes', get: (c) => c.likeCount },
  { header: 'replies', get: (c) => c.replyCount },
  { header: 'publishedAt', get: (c) => c.publishedAt },
];

export function commentsToCSV(comments: RawComment[]): string {
  const head = COMMENT_COLUMNS.map((c) => c.header).join(',');
  const rows = comments.map((c) => COMMENT_COLUMNS.map((col) => csvCell(col.get(c))).join(','));
  return [head, ...rows].join('\r\n');
}

export function commentsToJSON(videoId: string, comments: RawComment[]): string {
  return JSON.stringify({ videoId, generatedAt: new Date().toISOString(), comments }, null, 2);
}

export function commentsFilename(videoId: string, ext: 'csv' | 'json'): string {
  const slug = videoId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20) || 'video';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `tubescope-comments-${slug}-${date}.${ext}`;
}

export function suggestFilename(dataset: ChannelDataset, ext: 'csv' | 'json'): string {
  const slug =
    dataset.channel.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) ||
    dataset.channel.id;
  const date = dataset.generatedAt.slice(0, 10).replace(/-/g, '');
  return `tubescope-${slug}-${date}.${ext}`;
}
