/**
 * Browser-side telemetry (FR-7.1). Imported only by client components. Bodies go as text/plain so
 * `sendBeacon` never needs a CORS preflight; `/api/track` parses the text as JSON. The visitor id
 * travels in the httpOnly `rh_vid` cookie, never in the body (CLAUDE.md rule 4).
 */
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { EVENTS, TRACK_ENDPOINT, type EventName } from './events';

export interface TrackContext {
  repoSlug: string;
  variant: HeroLayout;
}

/** Use `beacon` when the page may be leaving (outbound click, pagehide). */
export function trackExperimentEvent(name: EventName, ctx: TrackContext, opts: { beacon?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ event: name, repoSlug: ctx.repoSlug, variant: ctx.variant });

  if (opts.beacon && typeof navigator.sendBeacon === 'function') {
    try {
      if (navigator.sendBeacon(TRACK_ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch {
      /* fall through to fetch */
    }
  }
  void fetch(TRACK_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {});
}

/* Conversion state shared by the copy buttons, the GitHub CTA and the bounce guardrail. */

const convertedThisPage = new Set<string>();
const intentSent = new Set<string>();

function intentStorageKey(slug: string): string {
  return `rh_intent:${slug}`;
}

/** True once a conversion fired on this page for the repo (silences the bounce guardrail). */
export function hasConverted(repoSlug: string): boolean {
  return convertedThisPage.has(repoSlug.toLowerCase());
}

/**
 * Claims the visitor's one `developer_intent` for this repo (FR-7.2). Persisted in localStorage so it
 * survives reloads; the server also deduplicates the Redis counter with SADD.
 */
function claimDeveloperIntent(repoSlug: string): boolean {
  const slug = repoSlug.toLowerCase();
  if (intentSent.has(slug)) return false;
  intentSent.add(slug);
  try {
    if (window.localStorage.getItem(intentStorageKey(slug))) return false;
    window.localStorage.setItem(intentStorageKey(slug), '1');
  } catch {
    /* storage blocked: the in-memory guard still holds for this page */
  }
  return true;
}

/** Sends a conversion event, then `developer_intent` if it's this visitor's first for the repo. */
export function trackConversion(name: EventName, ctx: TrackContext, opts: { beacon?: boolean } = {}): void {
  convertedThisPage.add(ctx.repoSlug.toLowerCase());
  trackExperimentEvent(name, ctx, opts);
  if (claimDeveloperIntent(ctx.repoSlug)) trackExperimentEvent(EVENTS.DEVELOPER_INTENT, ctx, opts);
}
