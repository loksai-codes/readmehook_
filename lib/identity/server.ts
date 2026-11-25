import 'server-only';
import { cookies, headers } from 'next/headers';
import { referrerSource, type ReferrerSource } from './referrer';
import { classifyRequest, type RequestKind } from './request';
import { isValidVisitorId, VISITOR_COOKIE } from './visitorId';

export interface VisitorContext {
  /** rh_vid; null for bots/prefetches or if the proxy did not run. */
  visitorId: string | null;
  kind: RequestKind;
  referrerSource: ReferrerSource;
}

/**
 * Reads the visitor for the current request. proxy.ts guarantees the rh_vid cookie is present on
 * the request for human page views (it forwards a freshly minted id on the first visit).
 */
export async function getVisitorContext(refParam: string | string[] | undefined): Promise<VisitorContext> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const kind = classifyRequest(h);
  const raw = c.get(VISITOR_COOKIE)?.value;
  return {
    visitorId: kind === 'human' && isValidVisitorId(raw) ? raw : null,
    kind,
    referrerSource: referrerSource(refParam, h.get('referer'), h.get('host')),
  };
}
