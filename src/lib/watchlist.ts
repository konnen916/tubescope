export interface WatchEntry {
  id: string;
  title: string;
  savedAt: string;
}

export function addToWatchlist(list: WatchEntry[], entry: WatchEntry): WatchEntry[] {
  if (list.some((e) => e.id === entry.id)) return list;
  return [entry, ...list];
}

export function removeFromWatchlist(list: WatchEntry[], id: string): WatchEntry[] {
  return list.filter((e) => e.id !== id);
}

export function isWatched(list: WatchEntry[], id: string): boolean {
  return list.some((e) => e.id === id);
}
