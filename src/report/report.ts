import type { ChannelDataset, VideoRow } from '../types';
import { esc } from '../lib/html';
import { toCSV, toJSON, suggestFilename } from '../lib/exporter';
import { viewsSkew, consistencyCV, distributionBuckets, uploadsPerMonth, durationSplit } from '../lib/report-metrics';
import { uploadTimelineSvg, viewsHistogramSvg, outlierBarsSvg } from '../lib/charts';

const app = () => document.getElementById('app')!;
const num = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number) => (n * 100).toFixed(2) + '%';

function download(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderEmpty(msg: string) {
  app().innerHTML = `<div id="empty" class="muted">${esc(msg)}</div>`;
}

function avgEngagement(rows: VideoRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((a, r) => a + r.engagementRate, 0) / rows.length;
}

let sortKey: keyof VideoRow = 'viewCount';
let sortDir = -1;
let filterText = '';

function wireTable(rows: VideoRow[]) {
  const body = document.getElementById('allbody')!;
  const draw = () => {
    const filtered = rows.filter((r) => r.title.toLowerCase().includes(filterText));
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey] as unknown;
      const bv = b[sortKey] as unknown;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
    body.innerHTML = sorted
      .map((v) => `<tr><td>${esc(v.title)}</td><td>${num(v.viewCount)}</td><td>${pct(v.engagementRate)}</td><td>${v.outlierScore.toFixed(1)}×</td><td>${v.durationSeconds}</td><td>${esc(v.publishedAt.slice(0, 10))}</td></tr>`)
      .join('');
  };
  document.querySelectorAll('#all th[data-k]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = (th as HTMLElement).dataset.k as keyof VideoRow;
      if (k === sortKey) sortDir *= -1;
      else {
        sortKey = k;
        sortDir = -1;
      }
      draw();
    });
  });
  const filter = document.getElementById('filter') as HTMLInputElement;
  filter.addEventListener('input', () => {
    filterText = filter.value.toLowerCase();
    draw();
  });
  draw();
}

function render(d: ChannelDataset) {
  const s = d.summary;
  const skew = viewsSkew(d.videos);
  const cv = consistencyCV(d.videos);
  const upm = uploadsPerMonth(d.videos);
  const split = durationSplit(d.videos);
  const buckets = distributionBuckets(d.videos);
  const outliers = [...d.videos].sort((a, b) => b.outlierScore - a.outlierScore).slice(0, 15);

  const card = (label: string, value: string) =>
    `<div class="card"><b>${esc(value)}</b><span class="muted">${esc(label)}</span></div>`;

  app().innerHTML = `
    <header class="top">
      ${d.channel.thumbnail ? `<img src="${esc(d.channel.thumbnail)}" alt="">` : ''}
      <div>
        <h1>${esc(d.channel.title)}</h1>
        <div class="muted">${num(d.channel.subscriberCount)} subs · ${num(d.channel.totalViewCount)} total views · ${num(d.channel.videoCount)} videos · since ${esc(d.channel.publishedAt.slice(0, 10))}${d.channel.country ? ' · ' + esc(d.channel.country) : ''}</div>
      </div>
    </header>
    <div>
      <button id="csv">Export CSV</button><button id="json">Export JSON</button>
      <span class="muted">Analysed ${esc(d.generatedAt.slice(0, 10))}</span>
    </div>

    <section><h2>Performance</h2><div class="cards">
      ${card('median views', num(s.medianViews))}
      ${card('mean views', num(s.meanViews))}
      ${card('skew (mean÷median)', skew.toFixed(2) + '×')}
      ${card('avg engagement', pct(avgEngagement(d.videos)))}
      ${card('uploads / month', upm.toFixed(1))}
      ${card('avg gap (days)', s.avgUploadGapDays == null ? '–' : s.avgUploadGapDays.toFixed(1))}
      ${card('best day', s.bestDayOfWeek ?? '–')}
      ${card('best hour (UTC)', s.bestHourUTC == null ? '–' : String(s.bestHourUTC))}
      ${card('consistency (CV)', cv.toFixed(2))}
    </div></section>

    <section><h2>Upload timeline</h2>${uploadTimelineSvg(d.videos)}</section>
    <section><h2>Views distribution</h2>${viewsHistogramSvg(buckets)}</section>
    <section><h2>Outliers (views ÷ median)</h2>${outlierBarsSvg(d.videos)}</section>

    <section><h2>What's working</h2>
      <div class="muted">Long-form (≥60s): ${num(split.long.count)} videos, median ${num(split.long.medianViews)} views · Shorts (&lt;60s): ${num(split.shorts.count)} videos, median ${num(split.shorts.medianViews)} views</div>
      <table><thead><tr><th>Title</th><th>Views</th><th>Outlier×</th><th>Eng.</th><th>Published</th></tr></thead><tbody>
      ${outliers.map((v) => `<tr><td>${esc(v.title)}</td><td>${num(v.viewCount)}</td><td>${v.outlierScore.toFixed(1)}×</td><td>${pct(v.engagementRate)}</td><td>${esc(v.publishedAt.slice(0, 10))}</td></tr>`).join('')}
      </tbody></table>
    </section>

    <section><h2>All videos (${num(d.videos.length)})</h2>
      <input id="filter" placeholder="filter by title…">
      <table id="all"><thead><tr>
        <th data-k="title">Title</th><th data-k="viewCount">Views</th><th data-k="engagementRate">Eng.</th>
        <th data-k="outlierScore">Outlier×</th><th data-k="durationSeconds">Dur(s)</th><th data-k="publishedAt">Published</th>
      </tr></thead><tbody id="allbody"></tbody></table>
    </section>

    <footer class="muted"><small>Data from YouTube's public Data API, computed client-side. No revenue estimate (not derivable for free).</small></footer>
  `;

  document.getElementById('csv')!.addEventListener('click', () => download(toCSV(d), suggestFilename(d, 'csv'), 'text/csv'));
  document.getElementById('json')!.addEventListener('click', () => download(toJSON(d), suggestFilename(d, 'json'), 'application/json'));
  wireTable(d.videos);
}

async function main() {
  const channelId = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!channelId) return renderEmpty('No channel specified.');
  const key = 'report:' + channelId;
  let stored: Record<string, unknown> = {};
  try {
    stored = await (browser.storage as any).session.get(key);
  } catch {
    return renderEmpty('Could not read report data.');
  }
  const dataset = stored[key] as ChannelDataset | undefined;
  if (!dataset) return renderEmpty('No data for this channel — open the channel on YouTube and click Analyse again.');
  render(dataset);
}

main();
