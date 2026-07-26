<div align="center">

<img src="src/icon.svg" width="88" height="88" alt="TubeScope logo">

# TubeScope

**Free, open-source YouTube channel analytics for Firefox.**

The research and export tools that other extensions lock behind a subscription, running entirely in your own browser, with your own API key. No account. No paywall. No server watching what you look up.

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Firefox](https://img.shields.io/badge/Firefox-MV3-orange) ![No backend](https://img.shields.io/badge/backend-none-green)

</div>

---

## Why

Analysing a YouTube channel is just math on public data: views, likes, comments, upload dates. Popular tools gate the useful parts (exporting a channel's stats, spotting outlier videos, seeing what tags a channel uses) behind a monthly fee. TubeScope does that part for free, because none of it needs a paid backend. You bring a free YouTube Data API key, and everything runs and stays on your machine.

## What it does

**Export**
- One click on any channel page pulls its full catalog and exports **CSV or JSON**: every video with views, likes, comments, duration, tags, engagement rate, views/day, and an outlier score.

**Channel Analyser report** (opens in its own tab)
- **Performance at a glance:** median vs mean views, skew, average engagement, upload cadence, best day and hour to post, consistency score.
- **Charts:** upload timeline, views distribution, and an outlier chart that highlights the breakout videos.
- **Best time to post:** a 7 day by 24 hour heatmap colored by how well uploads in each slot actually performed.
- **What is working:** the videos that beat the channel's own median, a long form vs shorts breakdown, and the words that show up most in the channel's top titles.
- **Top tags:** the tags a channel actually uses, ranked (the API exposes these even though YouTube hides them on the page).
- **View velocity leaders:** the videos with the most views per day right now, so you see momentum, not just old lifetime hits.
- **Sortable, searchable table** of every video, plus CSV and JSON export from the report too.

It works on **any public channel**: yours, a competitor's, or one you are researching.

## Install (from source)

TubeScope is early. For now you load it as a temporary add-on:

```bash
git clone https://github.com/konnen916/tubescope
cd tubescope
npm install
npm run build
```

Then in Firefox:

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** and pick `dist/manifest.json`
3. That's it. It stays until you close Firefox, then load it again the same way.

> A one-click install on **addons.mozilla.org** is planned so you will not need any of the above.

## Get a free API key

TubeScope talks to YouTube through the official **YouTube Data API v3**. The free quota (10,000 units/day) is plenty; a 1,000 video channel costs about 40 units.

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a project.
2. **APIs & Services > Library**, search **YouTube Data API v3**, click **Enable**.
3. **APIs & Services > Credentials > Create credentials > API key**.
4. Click the TubeScope toolbar icon to open its options, paste the key, and hit **Test key**.

> ### ⚠️ Restrict your key
> On the key's page in Google Cloud, set **API restrictions** to **YouTube Data API v3** only. Leave **Application restrictions** as None (browser extensions do not send a normal referrer). This way, if the key ever leaks, the worst anyone can do is spend your free YouTube quota. Never commit your key or paste it anywhere public.

## Use it

1. Open any channel on YouTube.
2. Click the red **Export analytics** button (bottom right).
3. Watch it pull the videos, then either export **CSV / JSON** or click **Open full report**.

## Privacy

- Your API key is stored **only in your browser** and is sent **only to Google's API**, never to us (there is no "us", there is no server).
- Channel data is fetched, computed, and rendered **on your machine**. Nothing is uploaded anywhere.
- No analytics, no tracking, no telemetry.

## What it does not do (on purpose)

TubeScope is honest about the free line. It does **not**:
- Estimate revenue or RPM (that number is a proprietary guess, not public data).
- Give "search volume" for keywords (also a proprietary estimate).
- Ship a giant curated database of channels/niches.
- See private analytics (watch time, retention, demographics) of channels you do not own.

It sticks to what public data can honestly tell you.

## Roadmap

- One-click install via addons.mozilla.org
- On-page stat overlays while you browse
- Competitor watchlists and trending explorer
- Approximate keyword suggestions (clearly labeled as estimates)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

TubeScope is an independent open-source project. It is **not affiliated with, endorsed by, or connected to** YouTube, Google, vidIQ, or NexLev. "YouTube" is a trademark of Google LLC. You are responsible for using your own API key within YouTube's and Google's terms.

## License

[MIT](LICENSE). Do what you like with it.
