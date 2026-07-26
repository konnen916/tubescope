import { removeFromWatchlist, type WatchEntry } from '../lib/watchlist';
import { esc } from '../lib/html';

const KEY = 'ytApiKey';
const WATCH_KEY = 'tubescope_watchlist';
const el = (id: string) => document.getElementById(id)!;
const input = () => el('key') as HTMLInputElement;

async function load() {
  const s = await browser.storage.local.get(KEY);
  input().value = (s[KEY] as string) || '';
}

async function save() {
  await browser.storage.local.set({ [KEY]: input().value.trim() });
  el('status').textContent = 'Saved.';
}

async function test() {
  const k = input().value.trim();
  if (!k) {
    el('status').textContent = 'Enter a key first.';
    return;
  }
  el('status').textContent = 'Testing…';
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${k}`);
    const b = await r.json();
    el('status').textContent = r.ok ? '✓ Key works.' : `✗ ${b?.error?.message || r.status}`;
  } catch (e: any) {
    el('status').textContent = '✗ ' + (e?.message || 'failed');
  }
}

async function loadWatchlist() {
  const s = await browser.storage.local.get(WATCH_KEY);
  const list = (s[WATCH_KEY] as WatchEntry[]) ?? [];
  const box = el('watchlist');
  if (list.length === 0) {
    box.textContent = 'No channels saved yet. Open a channel on YouTube and click Save.';
    return;
  }
  box.innerHTML = list
    .map(
      (e) =>
        `<div class="wl-item"><a href="https://www.youtube.com/channel/${esc(e.id)}" target="_blank" rel="noopener">${esc(e.title)}</a><button class="wl-remove" data-id="${esc(e.id)}">Remove</button></div>`,
    )
    .join('');
  box.querySelectorAll('.wl-remove').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = (b as HTMLElement).dataset.id!;
      const cur = ((await browser.storage.local.get(WATCH_KEY))[WATCH_KEY] as WatchEntry[]) ?? [];
      await browser.storage.local.set({ [WATCH_KEY]: removeFromWatchlist(cur, id) });
      loadWatchlist();
    });
  });
}

el('save').addEventListener('click', save);
el('test').addEventListener('click', test);
load();
loadWatchlist();
