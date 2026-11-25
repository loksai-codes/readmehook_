import { NextResponse, type NextRequest } from 'next/server';
import { isBot } from '@/lib/identity/bots';
import { isValidVisitorId, newVisitorId, VISITOR_COOKIE, visitorCookieOptions } from '@/lib/identity/visitorId';

/**
 * FR-5.1: ensure every human visitor has an `rh_vid` cookie. On the first visit the server component
 * sees the same id the browser will store (one identity across Flagsmith, telemetry and Redis —
 * CLAUDE.md rule 4).
 * FR-5.3: bots are never issued an id.
 */
export function proxy(request: NextRequest) {
  if (isBot(request.headers.get('user-agent'))) return NextResponse.next();
  if (isValidVisitorId(request.cookies.get(VISITOR_COOKIE)?.value)) return NextResponse.next();

  const id = newVisitorId();
  // Next forwards cookies set on the proxy response to the same request's `cookies()`,
  // so the server component already sees this id on the very first visit.
  const response = NextResponse.next();
  response.cookies.set(VISITOR_COOKIE, id, visitorCookieOptions());
  return response;
}

export const config = {
  // Card pages (+ stats) and the telemetry endpoint need the id; skip static assets and OG images.
  matcher: ['/r/:path*', '/api/track'],
};
