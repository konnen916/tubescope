import { collectChannelDataset } from '../lib/collect';
import { makeFetchJson } from '../lib/youtube-api';

const KEY_STORAGE = 'ytApiKey';

browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== 'tubescope') return;

  const safePost = (msg: any) => {
    try {
      port.postMessage(msg);
    } catch {
      // port disconnected (tab closed / add-on reloaded) — nothing to deliver to
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
      safePost({ event: 'result', dataset });
    } catch (e: any) {
      safePost({ event: 'error', message: e?.message ?? 'Unknown error' });
    }
  });
});
