const KEY = 'ytApiKey';
const el = (id: string) => document.getElementById(id)!;
const input = () => el('key') as HTMLInputElement;

async function load() {
  const s = await browser.storage.local.get(KEY);
  input().value = (s[KEY] as string) || '';
}

async function save() {
  await browser.storage.local.set({ [KEY]: input().value.trim() });
  el('status').textContent = 'Saved.';
}

async function test() {
  const k = input().value.trim();
  if (!k) {
    el('status').textContent = 'Enter a key first.';
    return;
  }
  el('status').textContent = 'Testing…';
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${k}`);
    const b = await r.json();
    el('status').textContent = r.ok ? '✓ Key works.' : `✗ ${b?.error?.message || r.status}`;
  } catch (e: any) {
    el('status').textContent = '✗ ' + (e?.message || 'failed');
  }
}

el('save').addEventListener('click', save);
el('test').addEventListener('click', test);
load();
