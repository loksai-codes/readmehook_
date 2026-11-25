/** Absolute base URL for OG images and share links (NEXT_PUBLIC_SITE_URL, inlined at build). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
}
