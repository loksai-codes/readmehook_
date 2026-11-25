/**
 * FR-10.5 admin gate. Edge/Node-safe (used by proxy.ts and the /insights page). The cookie holds a
 * SHA-256 of ADMIN_TOKEN, never the token itself; an unset ADMIN_TOKEN disables admin entirely.
 */
export const ADMIN_COOKIE = 'rh_admin';
export const ADMIN_PARAM = 'admin';
export const ADMIN_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison (length leaks only, which is fine for fixed-length hashes). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function adminToken(): string | null {
  return process.env.ADMIN_TOKEN?.trim() || null;
}

/** Cookie value to set when `candidate` is the right token, else null. */
export async function adminCookieFor(candidate: string | null | undefined): Promise<string | null> {
  const token = adminToken();
  if (!token || !candidate) return null;
  const [want, got] = await Promise.all([sha256Hex(token), sha256Hex(candidate)]);
  return safeEqual(want, got) ? want : null;
}

/** True when the request's admin cookie matches ADMIN_TOKEN. */
export async function isAdminCookie(cookieValue: string | null | undefined): Promise<boolean> {
  const token = adminToken();
  if (!token || !cookieValue) return false;
  return safeEqual(await sha256Hex(token), cookieValue);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/insights',
    maxAge: ADMIN_COOKIE_MAX_AGE_S,
  };
}
