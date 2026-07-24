# TubeScope

Free, open-source YouTube channel analytics exporter for Firefox. A client-side
alternative to vidIQ/NexLev's paywalled export — runs entirely in your browser
with your own free YouTube Data API key. No backend, no subscription.

## Phase 1 (this build)
Export any public channel's analytics (all videos, views, engagement, outliers,
upload cadence) as CSV or JSON from a button on the channel page.

## Setup
1. `npm install`
2. `npm run build` → outputs `dist/`
3. Firefox → `about:debugging` → This Firefox → Load Temporary Add-on → pick `dist/manifest.json`
4. Click the TubeScope toolbar icon → options → paste your YouTube Data API v3 key
   (get one free at console.cloud.google.com, enable "YouTube Data API v3").
5. Visit any channel page → click "⬇ Export analytics".

## Develop
- `npm run build:watch` — rebuild on change
- `npm test` — unit tests
- `npm run typecheck` — type check

MIT licensed.
