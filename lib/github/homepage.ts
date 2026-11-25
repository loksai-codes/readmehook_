/** Repo homepage → a safe outbound link (http/https only) and a short label. Pure. */
export function homepageLink(raw: string | null | undefined): { href: string; label: string } | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const path = url.pathname.replace(/\/+$/, '');
  return { href: url.toString(), label: `${url.host.replace(/^www\./, '')}${path}` };
}
