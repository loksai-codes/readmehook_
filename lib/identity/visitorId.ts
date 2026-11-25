/** rh_vid cookie contract (FR-5.1). Edge/Node-safe, no server-only imports (used by proxy.ts). */
import { v4 as uuidv4, validate, version } from 'uuid';

export const VISITOR_COOKIE = 'rh_vid';
export const VISITOR_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

export function isValidVisitorId(value: string | undefined | null): value is string {
  return typeof value === 'string' && validate(value) && version(value) === 4;
}

export function newVisitorId(): string {
  return uuidv4();
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VISITOR_COOKIE_MAX_AGE_S,
  };
}
