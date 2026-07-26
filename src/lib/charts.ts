import type { VideoRow } from '../types';
import type { Bucket } from './report-metrics';
import { esc } from './html';

const W = 640;
const H = 240;
const PAD = 32;

function frame(inner: string): string {
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
}

function axes(): string {
  return (
    `<line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="currentColor" opacity="0.3"/>` +
    `<line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="currentColor" opacity="0.3"/>`
  );
}

function emptyChart(msg: string): string {
  return frame(`<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="currentColor" opacity="0.6">${esc(msg)}</text>`);
}

function fmtCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}

function txt(x: number, y: number, s: string, extra = ''): string {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="currentColor" opacity="0.7" font-size="10" ${extra}>${esc(s)}</text>`;
}

export function uploadTimelineSvg(rows: VideoRow[]): string {
  if (rows.length === 0) return emptyChart('No videos');
  const pts = rows
    .map((r) => ({ t: new Date(r.publishedAt).getTime(), v: r.viewCount, title: r.title, date: r.publishedAt.slice(0, 10) }))
    .sort((a, b) => a.t - b.t);
  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t;
  const vMax = Math.max(...pts.map((p) => p.v), 1);
  const x = (t: number) => PAD + ((t - tMin) / (tMax - tMin || 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / vMax) * (H - 2 * PAD);
  const circles = pts
    .map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="currentColor" opacity="0.7"><title>${esc(p.title)}: ${fmtCompact(p.v)} views, ${esc(p.date)}</title></circle>`)
    .join('');
  const yr = (t: number) => new Date(t).getUTCFullYear();
  const labels =
    txt(PAD + 2, PAD - 4, fmtCompact(vMax) + ' views') +
    txt(PAD, H - PAD + 14, String(yr(tMin))) +
    txt(W - PAD - 26, H - PAD + 14, String(yr(tMax)));
  return frame(`<title>Upload timeline (views over time)</title>${axes()}${labels}${circles}`);
}

export function viewsHistogramSvg(buckets: Bucket[]): string {
  if (buckets.length === 0) return emptyChart('No data');
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const bw = (W - 2 * PAD) / buckets.length;
  const parts = buckets
    .map((b, i) => {
      const bh = (b.count / maxCount) * (H - 2 * PAD);
      const bx = PAD + i * bw;
      const by = H - PAD - bh;
      const cx = bx + bw / 2;
      const bar = `<rect x="${(bx + 2).toFixed(1)}" y="${by.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" fill="currentColor" opacity="0.75"><title>${esc(b.label)}: ${b.count}</title></rect>`;
      const count = b.count > 0
        ? `<text x="${cx.toFixed(1)}" y="${(by - 4).toFixed(1)}" fill="currentColor" opacity="0.85" font-size="10" text-anchor="middle">${b.count}</text>`
        : '';
      const range = `<text x="${cx.toFixed(1)}" y="${(H - PAD + 12).toFixed(1)}" fill="currentColor" opacity="0.6" font-size="9" text-anchor="middle">${esc(fmtCompact(b.min) + '-' + fmtCompact(b.max))}</text>`;
      return bar + count + range;
    })
    .join('');
  return frame(`<title>Views distribution</title>${axes()}${txt(2, PAD - 4, 'Videos')}${parts}`);
}

export function outlierBarsSvg(rows: VideoRow[], topN = 12): string {
  const top = [...rows].sort((a, b) => b.outlierScore - a.outlierScore).slice(0, topN);
  if (top.length === 0) return emptyChart('No videos');
  const maxScore = Math.max(...top.map((r) => r.outlierScore), 1);
  const chartH = H - 2 * PAD;
  const bw = (W - 2 * PAD) / top.length;
  const parts = top
    .map((r, i) => {
      const bh = (r.outlierScore / maxScore) * chartH;
      const bx = PAD + i * bw;
      const by = H - PAD - bh;
      const cx = bx + bw / 2;
      const fill = r.outlierScore >= 2 ? '#e00' : 'currentColor';
      const bar = `<rect x="${(bx + 2).toFixed(1)}" y="${by.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" fill="${fill}" opacity="0.8"><title>${esc(r.title)}: ${r.outlierScore.toFixed(1)}×</title></rect>`;
      const label = `<text x="${cx.toFixed(1)}" y="${(by - 4).toFixed(1)}" fill="currentColor" opacity="0.85" font-size="9" text-anchor="middle">${r.outlierScore.toFixed(1)}×</text>`;
      return bar + label;
    })
    .join('');
  return frame(`<title>Outlier videos (views ÷ median)</title>${axes()}${parts}`);
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function heatmapSvg(grid: number[][]): string {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return emptyChart('No data');
  const labelW = 34;
  const cellW = (W - labelW - PAD) / cols;
  const cellH = (H - 2 * PAD) / rows;
  let max = 0;
  for (const r of grid) for (const v of r) if (v > max) max = v;
  const parts: string[] = [];
  for (let d = 0; d < rows; d++) {
    for (let h = 0; h < cols; h++) {
      const v = grid[d][h];
      const op = max ? (v > 0 ? (v / max) * 0.9 + 0.1 : 0) : 0;
      const x = labelW + h * cellW;
      const yy = PAD + d * cellH;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="currentColor" opacity="${op.toFixed(3)}"><title>${esc(DAYS_SHORT[d] ?? String(d))} ${h}:00 UTC, ${Math.round(v).toLocaleString()} avg views</title></rect>`,
      );
    }
    parts.push(
      `<text x="0" y="${(PAD + d * cellH + cellH / 2 + 3).toFixed(1)}" fill="currentColor" opacity="0.7" font-size="10">${esc(DAYS_SHORT[d] ?? '')}</text>`,
    );
  }
  for (const h of [0, 6, 12, 18]) {
    const x = labelW + h * cellW;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${(H - PAD + 12).toFixed(1)}" fill="currentColor" opacity="0.6" font-size="9">${h}:00</text>`,
    );
  }
  return frame(`<title>Best time to post (avg views by day × hour, UTC)</title>${parts.join('')}`);
}
