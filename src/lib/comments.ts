import type { RawComment } from '../types';
import type { FetchJson } from './youtube-api';

const BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch top-level comments for a video. Costs 1 quota unit per page of 100.
 * maxPages caps the spend so a video with 200k comments cannot drain the day's quota.
 */
export async function fetchVideoComments(
  fj: FetchJson,
  apiKey: string,
  videoId: string,
  maxPages = 10,
  onPage?: (count: number) => void,
): Promise<RawComment[]> {
  const out: RawComment[] = [];
  let pageToken = '';
  let pages = 0;
  do {
    const url =
      `${BASE}/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}` +
      `&maxResults=100&order=relevance` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '') +
      `&key=${apiKey}`;
    const data = await fj(url);
    for (const it of data.items ?? []) {
      const s = it?.snippet?.topLevelComment?.snippet;
      if (!s) continue;
      out.push({
        commentId: String(it.id ?? ''),
        author: s.authorDisplayName ?? '',
        text: s.textOriginal ?? s.textDisplay ?? '',
        likeCount: Number(s.likeCount ?? 0),
        replyCount: Number(it.snippet?.totalReplyCount ?? 0),
        publishedAt: s.publishedAt ?? '',
      });
    }
    pageToken = data.nextPageToken ?? '';
    pages++;
    onPage?.(out.length);
  } while (pageToken && pages < maxPages);
  return out;
}

export interface CommentSummary {
  count: number;
  totalLikes: number;
  totalReplies: number;
  medianLikes: number;
  topLiked: RawComment | null;
}

export function summarizeComments(comments: RawComment[]): CommentSummary {
  if (comments.length === 0) {
    return { count: 0, totalLikes: 0, totalReplies: 0, medianLikes: 0, topLiked: null };
  }
  const likes = comments.map((c) => c.likeCount).sort((a, b) => a - b);
  const mid = Math.floor(likes.length / 2);
  const medianLikes = likes.length % 2 ? likes[mid] : (likes[mid - 1] + likes[mid]) / 2;
  let topLiked = comments[0];
  for (const c of comments) if (c.likeCount > topLiked.likeCount) topLiked = c;
  return {
    count: comments.length,
    totalLikes: comments.reduce((a, c) => a + c.likeCount, 0),
    totalReplies: comments.reduce((a, c) => a + c.replyCount, 0),
    medianLikes,
    topLiked,
  };
}
