import { it, expect } from 'vitest';
import { addToWatchlist, removeFromWatchlist, isWatched, type WatchEntry } from '../src/lib/watchlist';

const e = (id: string): WatchEntry => ({ id, title: 'ch ' + id, savedAt: '2026-01-01T00:00:00Z' });

it('adds to the front and dedupes by id', () => {
  let list: WatchEntry[] = [];
  list = addToWatchlist(list, e('UC1'));
  list = addToWatchlist(list, e('UC2'));
  list = addToWatchlist(list, e('UC1')); // dup, ignored
  expect(list.map((x) => x.id)).toEqual(['UC2', 'UC1']);
});

it('does not mutate the input array', () => {
  const orig = [e('UC1')];
  addToWatchlist(orig, e('UC2'));
  removeFromWatchlist(orig, 'UC1');
  expect(orig.map((x) => x.id)).toEqual(['UC1']);
});

it('removes by id and reports membership', () => {
  const list = [e('UC1'), e('UC2')];
  expect(isWatched(list, 'UC2')).toBe(true);
  const after = removeFromWatchlist(list, 'UC2');
  expect(after.map((x) => x.id)).toEqual(['UC1']);
  expect(isWatched(after, 'UC2')).toBe(false);
});
