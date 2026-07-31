import { it, expect, vi } from 'vitest';
import { fetchVideoComments, summarizeComments } from '../src/lib/comments';
import { commentsToCSV, commentsToJSON, commentsFilename } from '../src/lib/exporter';
import type { FetchJson } from '../src/lib/youtube-api';
import type { RawComment } from '../src/types';

function thread(id: string, text: string, likes = 0, replies = 0) {
  return {
    id,
    snippet: {
      totalReplyCount: replies,
      topLevelComment: {
        snippet: {
          authorDisplayName: 'someone',
          textOriginal: text,
          likeCount: likes,
          publishedAt: '2026-01-01T00:00:00Z',
        },
      },
    },
  };
}

function c(over: Partial<RawComment>): RawComment {
  return {
    commentId: 'c', author: 'a', text: 't', likeCount: 0, replyCount: 0,
    publishedAt: '2026-01-01T00:00:00Z', ...over,
  };
}

it('fetchVideoComments maps fields and paginates', async () => {
  const pages = [
    { items: [thread('c1', 'first', 5, 2)], nextPageToken: 'p2' },
    { items: [thread('c2', 'second', 1)] },
  ];
  let i = 0;
  const fj: FetchJson = async () => pages[i++];
  const out = await fetchVideoComments(fj, 'k', 'vid');
  expect(out.length).toBe(2);
  expect(out[0]).toMatchObject({ commentId: 'c1', text: 'first', likeCount: 5, replyCount: 2 });
  expect(out[1].text).toBe('second');
});

it('fetchVideoComments stops at maxPages so quota cannot drain', async () => {
  const calls = vi.fn(async () => ({ items: [thread('x', 'y')], nextPageToken: 'always' }));
  const out = await fetchVideoComments(calls as unknown as FetchJson, 'k', 'vid', 3);
  expect(calls).toHaveBeenCalledTimes(3);
  expect(out.length).toBe(3);
});

it('fetchVideoComments skips malformed threads without throwing', async () => {
  const fj: FetchJson = async () => ({ items: [{ id: 'broken' }, thread('ok', 'good')] });
  const out = await fetchVideoComments(fj, 'k', 'vid');
  expect(out.length).toBe(1);
  expect(out[0].text).toBe('good');
});

it('summarizeComments totals, medians, and finds the top comment', () => {
  const s = summarizeComments([
    c({ likeCount: 1, replyCount: 1 }),
    c({ likeCount: 9, replyCount: 0, text: 'best' }),
    c({ likeCount: 5, replyCount: 2 }),
  ]);
  expect(s.count).toBe(3);
  expect(s.totalLikes).toBe(15);
  expect(s.totalReplies).toBe(3);
  expect(s.medianLikes).toBe(5);
  expect(s.topLiked?.text).toBe('best');
});

it('summarizeComments handles an empty list', () => {
  const s = summarizeComments([]);
  expect(s.count).toBe(0);
  expect(s.topLiked).toBeNull();
});

it('commentsToCSV escapes newlines, quotes, and formula injection', () => {
  const csv = commentsToCSV([
    c({ text: 'line1\nline2, with "quotes"' }),
    c({ author: '=HYPERLINK("http://evil","x")' }),
  ]);
  const lines = csv.split('\r\n');
  expect(lines[0]).toBe('commentId,author,text,likes,replies,publishedAt');
  expect(lines[1]).toContain('"line1\nline2, with ""quotes"""');
  expect(csv).toContain("'=HYPERLINK");
});

it('commentsToJSON round-trips and commentsFilename sanitizes the id', () => {
  const parsed = JSON.parse(commentsToJSON('vid123', [c({ text: 'hi' })]));
  expect(parsed.videoId).toBe('vid123');
  expect(parsed.comments[0].text).toBe('hi');
  expect(commentsFilename('../../etc/passwd', 'csv')).toMatch(/^tubescope-comments-etcpasswd-\d{8}\.csv$/);
});
