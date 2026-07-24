import type { RawVideo, VideoRow, ChannelSummary } from '../types';

export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeVideoRows(videos: RawVideo[], now: Date = new Date()): VideoRow[] {
  const med = median(videos.map((v) => v.viewCount));
  return videos.map((v) => {
    const ageMs = now.getTime() - new Date(v.publishedAt).getTime();
    const ageDays = Math.max(ageMs / 86_400_000, 1 / 24);
    return {
      ...v,
      ageDays,
      viewsPerDay: v.viewCount / ageDays,
      engagementRate: v.viewCount ? (v.likeCount + v.commentCount) / v.viewCount : 0,
      likeRatio: v.viewCount ? v.likeCount / v.viewCount : 0,
      outlierScore: med ? v.viewCount / med : 0,
    };
  });
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function computeChannelSummary(rows: VideoRow[]): ChannelSummary {
  const views = rows.map((r) => r.viewCount);
  const totalViews = views.reduce((a, b) => a + b, 0);
  const sortedByViews = [...rows].sort((a, b) => b.viewCount - a.viewCount);

  const times = rows.map((r) => new Date(r.publishedAt).getTime()).sort((a, b) => a - b);
  let avgUploadGapDays: number | null = null;
  if (times.length > 1) {
    let sum = 0;
    for (let i = 1; i < times.length; i++) sum += times[i] - times[i - 1];
    avgUploadGapDays = sum / (times.length - 1) / 86_400_000;
  }

  const dayViews = new Array(7).fill(0);
  const hourViews = new Array(24).fill(0);
  for (const r of rows) {
    const d = new Date(r.publishedAt);
    dayViews[d.getUTCDay()] += r.viewCount;
    hourViews[d.getUTCHours()] += r.viewCount;
  }
  const bestDayIdx = rows.length ? dayViews.indexOf(Math.max(...dayViews)) : -1;
  const bestHourIdx = rows.length ? hourViews.indexOf(Math.max(...hourViews)) : -1;

  return {
    videoCount: rows.length,
    totalViews,
    medianViews: median(views),
    meanViews: rows.length ? totalViews / rows.length : 0,
    avgUploadGapDays,
    bestDayOfWeek: bestDayIdx >= 0 ? DAYS[bestDayIdx] : null,
    bestHourUTC: bestHourIdx >= 0 ? bestHourIdx : null,
    topPerformers: sortedByViews.slice(0, 5),
    bottomPerformers: sortedByViews.slice(-5).reverse(),
  };
}
