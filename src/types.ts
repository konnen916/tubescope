export interface ChannelMeta {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  subscriberCount: number;
  totalViewCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
  thumbnail: string;
  country?: string;
}

export interface RawVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  durationSeconds: number;
  definition: string;
  caption: boolean;
  tags: string[];
  categoryId: string;
  thumbnail: string;
}

export interface VideoMetrics {
  ageDays: number;
  viewsPerDay: number;
  engagementRate: number;
  likeRatio: number;
  outlierScore: number;
}

export type VideoRow = RawVideo & VideoMetrics;

export interface ChannelSummary {
  videoCount: number;
  totalViews: number;
  medianViews: number;
  meanViews: number;
  avgUploadGapDays: number | null;
  bestDayOfWeek: string | null;
  bestHourUTC: number | null;
  topPerformers: VideoRow[];
  bottomPerformers: VideoRow[];
}

export interface RawComment {
  commentId: string;
  author: string;
  text: string;
  likeCount: number;
  replyCount: number;
  publishedAt: string;
}

export interface ChannelDataset {
  channel: ChannelMeta;
  summary: ChannelSummary;
  videos: VideoRow[];
  generatedAt: string;
}
