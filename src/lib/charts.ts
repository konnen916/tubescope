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

export function uploadTimelineSvg(rows: VideoRow[]): string {
  if (rows.length === 0) return emptyChart('No videos');
  const pts = rows
    .map((r) => ({ t: new Date(r.publishedAt).getTime(), v: r.viewCount }))
    .sort((a, b) => a.t - b.t);
  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t;
  const vMax = Math.max(...pts.map((p) => p.v), 1);
  const x = (t: number) => PAD + ((t - tMin) / (tMax - tMin || 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / vMax) * (H - 2 * PAD);
  const circles = pts
    .map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3" fill="currentColor" opacity="0.75"/>`)
    .join('');
  return frame(`<title>Upload timeline (views over time)</title>${axes()}${circles}`);
}

export function viewsHistogramSvg(buckets: Bucket[]): string {
  if (buckets.length === 0) return emptyChart('No data');
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const bw = (W - 2 * PAD) / buckets.length;
  const bars = buckets
    .map((b, i) => {
      const bh = (b.count / maxCount) * (H - 2 * PAD);
      const bx = PAD + i * bw;
      const by = H - PAD - bh;
      return `<rect x="${(bx + 2).toFixed(1)}" y="${by.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" fill="currentColor" opacity="0.75"><title>${esc(b.label)}: ${b.count}</title></rect>`;
    })
    .join('');
  return frame(`<title>Views distribution</title>${axes()}${bars}`);
}

export function outlierBarsSvg(rows: VideoRow[], topN = 12): string {
  const top = [...rows].sort((a, b) => b.outlierScore - a.outlierScore).slice(0, topN);
  if (top.length === 0) return emptyChart('No videos');
  const maxScore = Math.max(...top.map((r) => r.outlierScore), 1);
  const bw = (W - 2 * PAD) / top.length;
  const bars = top
    .map((r, i) => {
      const bh = (r.outlierScore / maxScore) * (H - 2 * PAD);
      const bx = PAD + i * bw;
      const by = H - PAD - bh;
      const fill = r.outlierScore >= 2 ? '#e00' : 'currentColor';
      return `<rect x="${(bx + 2).toFixed(1)}" y="${by.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" fill="${fill}" opacity="0.8"><title>${esc(r.title)}: ${r.outlierScore.toFixed(1)}×</title></rect>`;
    })
    .join('');
  return frame(`<title>Outlier videos (views ÷ median)</title>${axes()}${bars}`);
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
      const y = PAD + d * cellH;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="currentColor" opacity="${op.toFixed(3)}"><title>${esc(DAYS_SHORT[d] ?? String(d))} ${h}:00 UTC, ${Math.round(v).toLocaleString()} avg views</title></rect>`,
      );
    }
    parts.push(
      `<text x="0" y="${(PAD + d * cellH + cellH / 2 + 3).toFixed(1)}" fill="currentColor" opacity="0.7" font-size="10">${esc(DAYS_SHORT[d] ?? '')}</text>`,
    );
  }
  return frame(`<title>Best time to post (avg views by day × hour, UTC)</title>${parts.join('')}`);
}
