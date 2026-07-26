import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });

const options = {
  entryPoints: {
    background: 'src/background/index.ts',
    content: 'src/content/inject.ts',
    options: 'src/options/options.ts',
    report: 'src/report/report.ts',
  },
  bundle: true,
  format: 'iife',
  target: ['firefox115'],
  outdir: 'dist',
  logLevel: 'info',
};

function copyStatic() {
  cpSync('src/manifest.json', 'dist/manifest.json');
  cpSync('src/options/options.html', 'dist/options.html');
  cpSync('src/report/report.html', 'dist/report.html');
  cpSync('src/icon.svg', 'dist/icon.svg');
}

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  copyStatic();
  console.log('esbuild: watching…');
} else {
  await esbuild.build(options);
  copyStatic();
  console.log('esbuild: build complete → dist/');
}
