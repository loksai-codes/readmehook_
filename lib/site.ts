/**
 * Absolute base URL for OG images and share links. NEXT_PUBLIC_SITE_URL wins (set it for a custom
 * domain); on Vercel it falls back to the project's production domain, which Vercel provides as
 * NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL (host only, inlined at build).
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (vercel ? `https://${vercel}` : 'http://localhost:3000');
  return url.replace(/\/+$/, '');
}
