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

const CTRL_ID = 'tubescope-controls';
const FONT = "500 13px 'Roboto','Segoe UI',system-ui,sans-serif";
const CHIP_BG = 'rgba(18,18,18,0.94)';
const CHIP_BG_HOVER = 'rgba(45,45,45,0.96)';
const BRAND_DOT =
  '<span style="width:7px;height:7px;border-radius:50%;background:#ff0033;display:inline-block;flex:none"></span>';

function chip(el: HTMLButtonElement) {
  Object.assign(el.style, {
    background: CHIP_BG, color: '#f1f1f1', border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: '18px', padding: '7px 14px', font: FONT, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    transition: 'background .15s, border-color .15s',
  });
  el.addEventListener('mouseenter', () => { el.style.background = CHIP_BG_HOVER; });
  el.addEventListener('mouseleave', () => { el.style.background = CHIP_BG; });
}

function controlsEl(): HTMLElement {
  let c = document.getElementById(CTRL_ID);
  if (!c) {
    c = document.createElement('div');
    c.id = CTRL_ID;
    Object.assign(c.style, {
      position: 'fixed', bottom: '16px', right: '16px', zIndex: '99999',
      display: 'flex', gap: '8px', alignItems: 'center',
    });
    document.body.appendChild(c);
  }
  return c;
}

async function refreshSaveLabel(btn: HTMLButtonElement) {
  const id = currentChannelId();
  const list = await getWatchlist();
  const saved = !!id && isWatched(list, id);
  btn.textContent = saved ? 'Saved' : 'Save';
  btn.style.borderColor = saved ? 'rgba(255,0,51,0.55)' : 'rgba(255,255,255,0.16)';
  btn.style.color = saved ? '#ff5c78' : '#f1f1f1';
}

function makeExportButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = BTN_ID;
  chip(b);
  b.innerHTML = BRAND_DOT + 'Export';
  b.title = "Export this channel's analytics (CSV, JSON, full report)";
  b.addEventListener('click', startExport);
  return b;
}

function makeSaveButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = SAVE_ID;
  chip(b);
  b.textContent = 'Save';
  b.title = 'Save this channel to your watchlist';
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
  chip(b);
  b.innerHTML = BRAND_DOT + 'Stats';
  b.title = 'Quick stats for this video';
  b.addEventListener('click', loadVideoStats);
  return b;
}

function syncUi() {
  const onChannel = isChannelPage();
  const videoId = currentVideoId();
  const showWatch = !!videoId && !onChannel;

  if (!onChannel && !showWatch) {
    document.getElementById(CTRL_ID)?.remove();
    return;
  }
  const c = controlsEl();
  const pill = document.getElementById(PILL_ID) as HTMLButtonElement | null;
  const exp = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  const save = document.getElementById(SAVE_ID) as HTMLButtonElement | null;

  if (onChannel) {
    pill?.remove();
    if (!save) c.appendChild(makeSaveButton());
    if (!exp) c.appendChild(makeExportButton());
    const sb = document.getElementById(SAVE_ID) as HTMLButtonElement | null;
    if (sb) void refreshSaveLabel(sb).catch(() => {});
  } else {
    save?.remove();
    exp?.remove();
    if (!pill) c.appendChild(makePill());
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
    .box{position:fixed;bottom:64px;right:16px;width:330px;max-height:70vh;overflow:auto;background:rgba(18,18,18,0.97);color:#f1f1f1;border:1px solid rgba(255,255,255,0.16);border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,0.55);padding:16px 16px 18px;font:13px/1.5 'Roboto','Segoe UI',system-ui,sans-serif;z-index:99999;backdrop-filter:blur(6px)}
    .box b{font-weight:600}
    .box button{cursor:pointer;margin:12px 6px 0 0;padding:7px 12px;border:1px solid rgba(255,255,255,0.16);border-radius:16px;background:rgba(45,45,45,0.9);color:#f1f1f1;font:500 12px 'Roboto',system-ui,sans-serif}
    .box button:hover{background:rgba(70,70,70,0.95)}
    .box #report{border-color:rgba(255,0,51,0.5)}
    .box table{width:100%;border-collapse:collapse;margin-top:10px}
    .box td,.box th{border-bottom:1px solid rgba(255,255,255,0.1);padding:4px 3px;text-align:left;font-size:11px}
    .box .close{position:absolute;top:10px;right:12px;background:transparent;border:none;color:#8a8a8a;font-size:16px;padding:0;margin:0}
    .box .close:hover{color:#fff}
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
    <button id="report">Open report</button><button id="csv">Export CSV</button><button id="json">Export JSON</button>
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
