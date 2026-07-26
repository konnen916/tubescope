import type { RawVideo } from '../types';

export interface QuickStats {
  viewsPerDay: number;
  engagementRate: number;
  likeRatio: number;
  ageDays: number;
}

export function quickStats(v: RawVideo, now: Date = new Date()): QuickStats {
  const ageMs = now.getTime() - new Date(v.publishedAt).getTime();
  const ageDays = Math.max(ageMs / 86_400_000, 1 / 24);
  return {
    ageDays,
    viewsPerDay: v.viewCount / ageDays,
    engagementRate: v.viewCount ? (v.likeCount + v.commentCount) / v.viewCount : 0,
    likeRatio: v.viewCount ? v.likeCount / v.viewCount : 0,
  };
}
