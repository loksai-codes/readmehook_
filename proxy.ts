import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, ADMIN_PARAM, adminCookieFor, adminCookieOptions } from '@/lib/identity/admin';
import { isBot } from '@/lib/identity/bots';
import { isValidVisitorId, newVisitorId, VISITOR_COOKIE, visitorCookieOptions } from '@/lib/identity/visitorId';

/**
 * FR-5.1: ensure every human visitor has an `rh_vid` cookie. On the first visit the server component
 * sees the same id the browser will store (one identity across Flagsmith, telemetry and Redis —
 * CLAUDE.md rule 4).
 * FR-5.3: bots are never issued an id.
 * FR-10.5: `/insights?admin=<ADMIN_TOKEN>` swaps the token for an httpOnly cookie (a hash, never the
 * token) and redirects to a clean URL, so the token doesn't linger in the address bar or history.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/insights') return insightsAdmin(request);

  if (isBot(request.headers.get('user-agent'))) return NextResponse.next();
  if (isValidVisitorId(request.cookies.get(VISITOR_COOKIE)?.value)) return NextResponse.next();

  const id = newVisitorId();
  // Next forwards cookies set on the proxy response to the same request's `cookies()`,
  // so the server component already sees this id on the very first visit.
  const response = NextResponse.next();
  response.cookies.set(VISITOR_COOKIE, id, visitorCookieOptions());
  return response;
}

async function insightsAdmin(request: NextRequest) {
  const candidate = request.nextUrl.searchParams.get(ADMIN_PARAM);
  if (candidate === null) return NextResponse.next();

  const clean = request.nextUrl.clone();
  clean.searchParams.delete(ADMIN_PARAM);
  const response = NextResponse.redirect(clean, 303);
  const value = await adminCookieFor(candidate);
  if (value) response.cookies.set(ADMIN_COOKIE, value, adminCookieOptions());
  return response;
}

export const config = {
  // Card pages (+ stats) and the telemetry endpoint need the id; /insights handles the admin token.
  // Static assets and OG images are skipped.
  matcher: ['/r/:path*', '/api/track', '/insights'],
};
