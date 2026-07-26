import type { VideoRow } from '../types';

export function bestTimeHeatmap(rows: VideoRow[]): number[][] {
  const sum: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const cnt: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const r of rows) {
    const d = new Date(r.publishedAt);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    if (Number.isNaN(day) || Number.isNaN(hour)) continue;
    sum[day][hour] += r.viewCount;
    cnt[day][hour] += 1;
  }
  return sum.map((rowSum, day) => rowSum.map((s, hour) => (cnt[day][hour] ? s / cnt[day][hour] : 0)));
}

export interface TagCount {
  tag: string;
  count: number;
}

export function topTags(rows: VideoRow[], limit = 25): TagCount[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const raw of r.tags) {
      const tag = raw.trim();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'up', 'out', 'if', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this',
  'that', 'these', 'those', 'as', 'how', 'why', 'what', 'when', 'who', 'you', 'your', 'i',
  'my', 'we', 'our', 'they', 'their', 'he', 'she', 'his', 'her', 'do', 'does', 'did', 'not',
  'no', 'yes', 'can', 'will', 'just', 'get', 'got', 'vs',
]);

export interface WordCount {
  word: string;
  count: number;
}

export function winningTitleWords(rows: VideoRow[], topN = 15, limit = 20): WordCount[] {
  const winners = [...rows].sort((a, b) => b.outlierScore - a.outlierScore).slice(0, topN);
  const counts = new Map<string, number>();
  for (const v of winners) {
    const tokens = v.title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const w of tokens) {
      if (w.length < 3 || STOPWORDS.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}

export function velocityLeaders(rows: VideoRow[], limit = 10): VideoRow[] {
  return [...rows].sort((a, b) => b.viewsPerDay - a.viewsPerDay).slice(0, limit);
}
