import { collectChannelDataset } from '../lib/collect';
import { makeFetchJson, fetchVideosByIds } from '../lib/youtube-api';
import { stripThumbnails } from '../lib/report-metrics';
import type { ChannelDataset } from '../types';

const KEY_STORAGE = 'ytApiKey';

async function cacheForReport(channelId: string, dataset: ChannelDataset): Promise<void> {
  const key = 'report:' + channelId;
  const session = (browser.storage as any).session;
  try {
    await session.set({ [key]: dataset });
  } catch {
    try {
      await session.set({ [key]: stripThumbnails(dataset) });
    } catch {
      // give up silently; the report page shows a missing-data fallback
    }
  }
}

async function handleVideo(videoId: string): Promise<any> {
  try {
    const stored = await browser.storage.local.get(KEY_STORAGE);
    const apiKey = stored[KEY_STORAGE] as string | undefined;
    if (!apiKey) return { event: 'nokey' };
    const [video] = await fetchVideosByIds(makeFetchJson(), apiKey, [videoId]);
    return video ? { event: 'result', video } : { event: 'error', message: 'Video not found' };
  } catch (e: any) {
    return { event: 'error', message: e?.message ?? 'Unknown error' };
  }
}

browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

browser.runtime.onMessage.addListener((msg: any) => {
  if (msg?.cmd === 'report' && typeof msg.channelId === 'string') {
    browser.tabs.create({ url: browser.runtime.getURL('report.html#' + msg.channelId) });
    return;
  }
  if (msg?.cmd === 'video' && typeof msg.videoId === 'string') {
    return handleVideo(msg.videoId);
  }
});

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== 'tubescope') return;

  const safePost = (msg: any) => {
    try {
      port.postMessage(msg);
    } catch {
      // port disconnected (tab closed / add-on reloaded); nothing to deliver to
    }
  };

  port.onMessage.addListener(async (msg: any) => {
    if (msg?.cmd !== 'fetch') return;
    try {
      const stored = await browser.storage.local.get(KEY_STORAGE);
      const apiKey = stored[KEY_STORAGE] as string | undefined;
      if (!apiKey) {
        safePost({ event: 'nokey' });
        return;
      }
      const dataset = await collectChannelDataset(
        { apiKey, fetchJson: makeFetchJson() },
        msg.channelId,
        (fetched, total) => safePost({ event: 'progress', fetched, total }),
      );
      await cacheForReport(msg.channelId, dataset);
      safePost({ event: 'result', dataset });
    } catch (e: any) {
      safePost({ event: 'error', message: e?.message ?? 'Unknown error' });
    }
  });
});
