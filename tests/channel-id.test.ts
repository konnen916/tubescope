import { it, expect } from 'vitest';
import { extractChannelIdFromHtml } from '../src/lib/channel-id';

it('reads externalId first', () => {
  const html = 'x"externalId":"UC1234567890123456789012"y';
  expect(extractChannelIdFromHtml(html)).toBe('UC1234567890123456789012');
});

it('falls back to canonical link (any attribute order)', () => {
  const html = '<link href="https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv" rel="canonical">';
  expect(extractChannelIdFromHtml(html)).toBe('UCabcdefghijklmnopqrstuv');
});

it('returns null when no channel id present', () => {
  expect(extractChannelIdFromHtml('<html>nothing</html>')).toBeNull();
});
