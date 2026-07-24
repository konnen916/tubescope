export function extractChannelIdFromHtml(html: string): string | null {
  const external = html.match(/"externalId":"(UC[0-9A-Za-z_-]{22})"/);
  if (external) return external[1];
  const canonicalTag = html.match(/<link[^>]*rel="canonical"[^>]*>/i);
  if (canonicalTag) {
    const uc = canonicalTag[0].match(/(UC[0-9A-Za-z_-]{22})/);
    if (uc) return uc[1];
  }
  return null;
}
