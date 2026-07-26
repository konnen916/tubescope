import { extractChannelIdFromHtml } from '../lib/channel-id';
import { toCSV, toJSON, suggestFilename } from '../lib/exporter';
import { esc } from '../lib/html';
import { quickStats } from '../lib/quick-stats';
import { addToWatchlist, removeFromWatchlist, isWatched, type WatchEntry } from '../lib/watchlist';
import type { ChannelDataset } from '../types';

const BTN_ID = 'tubescope-export-btn';
const SAVE_ID = 'tubescope-save-btn';
const PILL_ID = 'tubescope-stats-pill';
const WATCH_KEY = 'tubescope_watchlist';

let dataset: ChannelDataset | null = null;
let activePort: ReturnType<typeof browser.runtime.connect> | null = null;

function liveChannelId(): string | null {
  const sources = [
    document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href,
  ];
  for (const s of sources) {
    const m = s?.match(/\/channel\/(UC[0-9A-Za-z_-]{22})/);
    if (m) return m[1];
  }
  return null;
}

function currentChannelId(): string | null {
  return liveChannelId() ?? extractChannelIdFromHtml(document.documentElement.outerHTML);
}

function currentChannelTitle(): string {
  const og = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  return (og || document.title.replace(/ - YouTube$/, '')).trim();
}

function isChannelPage(): boolean {
  return /^\/(@[^/]+|channel\/|c\/|user\/)/.test(location.pathname) && !!currentChannelId();
}

function currentVideoId(): string | null {
  if (location.pathname !== '/watch') return null;
  return new URLSearchParams(location.search).get('v');
}

async function getWatchlist(): Promise<WatchEntry[]> {
  const s = await browser.storage.local.get(WATCH_KEY);
  return (s[WATCH_KEY] as WatchEntry[]) ?? [];
}

async function setWatchlist(list: WatchEntry[]): Promise<void> {
  await browser.storage.local.set({ [WATCH_KEY]: list });
}

function pinBtn(el: HTMLButtonElement, right: string, bg: string) {
  Object.assign(el.style, {
    position: 'fixed', bottom: '20px', right, zIndex: '99999',
    padding: '10px 14px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer', font: '600 14px sans-serif',
  });
}

async function refreshSaveLabel(btn: HTMLButtonElement) {
  const id = currentChannelId();
  const list = await getWatchlist();
  btn.textContent = id && isWatched(list, id) ? '★ Saved' : '☆ Save';
}

function makeExportButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = BTN_ID;
  b.textContent = '⬇ Export analytics';
  pinBtn(b, '20px', '#c00');
  b.addEventListener('click', startExport);
  return b;
}

function makeSaveButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = SAVE_ID;
  pinBtn(b, '182px', '#333');
  b.addEventListener('click', async () => {
    const id = currentChannelId();
    if (!id) return;
    let list = await getWatchlist();
    list = isWatched(list, id)
      ? removeFromWatchlist(list, id)
      : addToWatchlist(list, { id, title: currentChannelTitle(), savedAt: new Date().toISOString() });
    await setWatchlist(list);
    void refreshSaveLabel(b).catch(() => {});
  });
  return b;
}

function makePill(): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = PILL_ID;
  b.textContent = '📊 Stats';
  Object.assign(b.style, {
    position: 'fixed', bottom: '20px', left: '20px', zIndex: '99999',
    padding: '8px 14px', background: '#c00', color: '#fff', border: 'none',
    borderRadius: '20px', cursor: 'pointer', font: '600 13px sans-serif',
  });
  b.addEventListener('click', loadVideoStats);
  return b;
}

function syncUi() {
  const onChannel = isChannelPage();
  const videoId = currentVideoId();

  const existingExport = document.getElementById(BTN_ID);
  const existingSave = document.getElementById(SAVE_ID) as HTMLButtonElement | null;
  if (onChannel) {
    if (!existingExport) document.body.appendChild(makeExportButton());
    let sb = existingSave;
    if (!sb) {
      sb = makeSaveButton();
      document.body.appendChild(sb);
    }
    void refreshSaveLabel(sb).catch(() => {});
  } else {
    existingExport?.remove();
    existingSave?.remove();
  }

  const existingPill = document.getElementById(PILL_ID);
  if (videoId) {
    if (!existingPill) document.body.appendChild(makePill());
  } else {
    existingPill?.remove();
  }
}

function shadow(): ShadowRoot {
  let host = document.getElementById('tubescope-panel-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'tubescope-panel-host';
    document.body.appendChild(host);
    host.attachShadow({ mode: 'open' });
  }
  return (host as HTMLElement).shadowRoot!;
}

function closePanel() {
  activePort?.disconnect();
  activePort = null;
  shadow().innerHTML = '';
}

function render(inner: string) {
  const sr = shadow();
  sr.innerHTML = `<style>
    .box{position:fixed;bottom:70px;right:20px;width:340px;max-height:70vh;overflow:auto;background:#fff;color:#111;border:1px solid #ccc;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.2);padding:14px;font:13px sans-serif;z-index:99999}
    button{cursor:pointer;margin:6px 6px 0 0;padding:6px 10px;border:none;border-radius:6px;background:#c00;color:#fff}
    table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border-bottom:1px solid #eee;padding:3px;text-align:left;font-size:11px}
    .close{position:absolute;top:8px;right:10px;background:transparent;color:#888;font-size:16px;padding:0}
  </style><div class="box">${inner}</div>`;
  sr.querySelector('.close')?.addEventListener('click', closePanel);
}

function download(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadVideoStats() {
  const videoId = currentVideoId();
  if (!videoId) return;
  render('<button class="close">✕</button>Loading video stats…');
  let res: any;
  try {
    res = await browser.runtime.sendMessage({ cmd: 'video', videoId });
  } catch (e: any) {
    render(`<button class="close">✕</button>Error: ${esc(e?.message ?? 'could not load')}`);
    return;
  }
  if (res?.event === 'nokey') {
    render('<button class="close">✕</button>No API key set. Open the TubeScope options (toolbar icon) and add your YouTube Data API key.');
    return;
  }
  if (res?.event !== 'result') {
    render(`<button class="close">✕</button>Error: ${esc(res?.message ?? 'could not load')}`);
    return;
  }
  const v = res.video;
  const q = quickStats(v);
  render(`<button class="close">✕</button>
    <b>${esc(v.title)}</b><br>
    ${v.viewCount.toLocaleString()} views · ${v.likeCount.toLocaleString()} likes · ${v.commentCount.toLocaleString()} comments<br>
    ${Math.round(q.viewsPerDay).toLocaleString()} views/day · ${(q.engagementRate * 100).toFixed(2)}% engagement<br>
    ${(q.likeRatio * 100).toFixed(2)}% like ratio · ${Math.round(q.ageDays)} days old · ${v.durationSeconds}s · ${v.tags.length} tags`);
}

function renderResult() {
  if (!dataset) return;
  const s = dataset.summary;
  const top = s.topPerformers
    .map((v) => `<tr><td>${esc(v.title.slice(0, 40))}</td><td>${v.viewCount.toLocaleString()}</td></tr>`)
    .join('');
  render(`<button class="close">✕</button>
    <b>${esc(dataset.channel.title)}</b><br>
    ${s.videoCount} videos · ${s.totalViews.toLocaleString()} views<br>
    median ${s.medianViews.toLocaleString()} · best day ${esc(s.bestDayOfWeek ?? '-')}<br>
    <button id="report">📊 Open full report</button><button id="csv">Export CSV</button><button id="json">Export JSON</button>
    <table><tr><th>Top videos</th><th>Views</th></tr>${top}</table>`);
  const sr = shadow();
  sr.querySelector('#csv')?.addEventListener('click', () =>
    download(toCSV(dataset!), suggestFilename(dataset!, 'csv'), 'text/csv'));
  sr.querySelector('#json')?.addEventListener('click', () =>
    download(toJSON(dataset!), suggestFilename(dataset!, 'json'), 'application/json'));
  sr.querySelector('#report')?.addEventListener('click', () =>
    browser.runtime.sendMessage({ cmd: 'report', channelId: dataset!.channel.id }));
}

function startExport() {
  const channelId = currentChannelId();
  if (!channelId) {
    render('<button class="close">✕</button>Could not detect a channel on this page.');
    return;
  }
  activePort?.disconnect();
  dataset = null;
  render('<button class="close">✕</button>Connecting…');
  const port = browser.runtime.connect({ name: 'tubescope' });
  activePort = port;
  port.postMessage({ cmd: 'fetch', channelId });
  port.onMessage.addListener((msg: any) => {
    if (port !== activePort) return;
    if (msg.event === 'progress') {
      render(`<button class="close">✕</button>Fetching videos… ${msg.fetched}/${msg.total || '?'}`);
    } else if (msg.event === 'nokey') {
      activePort = null;
      render('<button class="close">✕</button>No API key set. Open the TubeScope options (toolbar icon) and add your YouTube Data API key.');
    } else if (msg.event === 'error') {
      activePort = null;
      render(`<button class="close">✕</button>Error: ${esc(msg.message)}`);
    } else if (msg.event === 'result') {
      activePort = null;
      dataset = msg.dataset;
      renderResult();
    }
  });
}

syncUi();
document.addEventListener('yt-navigate-finish', () => setTimeout(syncUi, 500));
