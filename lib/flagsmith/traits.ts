/** Builds the Flagsmith identity traits for a card view (PRD §5). Pure. */
import type { RepoSnapshot } from '@/lib/github/types';
import type { ParsedReadme } from '@/lib/parser/types';
import { CONTROL, HERO_LAYOUTS, type HeroLayout, type HeroTraits } from './variants';

export function buildHeroTraits(
  snapshot: Pick<RepoSnapshot, 'meta'>,
  parsed: Pick<ParsedReadme, 'hasDemoMedia' | 'hasMermaid'>,
  referrer: HeroTraits['referrer_source'],
): HeroTraits {
  return {
    repo_language: snapshot.meta.language ?? 'unknown',
    has_demo_video: parsed.hasDemoMedia,
    has_mermaid_diagram: parsed.hasMermaid,
    referrer_source: referrer,
    repo_slug: snapshot.meta.fullName.toLowerCase(),
  };
}

/**
 * Milestone 2 review aid: `?variant=` forces a layout, but only when NODE_ENV !== 'production'.
 * Returns null in production or for unknown values.
 */
export function devVariantOverride(param: string | string[] | undefined): HeroLayout | null {
  if (process.env.NODE_ENV === 'production') return null;
  const value = Array.isArray(param) ? param[0] : param;
  return HERO_LAYOUTS.includes(value as HeroLayout) ? (value as HeroLayout) : null;
}

export type VariantPlan =
  | { source: 'forced'; variant: HeroLayout }
  | { source: 'flagsmith'; visitorId: string }
  | { source: 'creator'; variant: HeroLayout }
  | { source: 'control'; variant: HeroLayout };

/** `?created=1` marks the creator's own view right after generating the card (FR-1.3). */
export function isCreatorView(param: string | string[] | undefined): boolean {
  return (Array.isArray(param) ? param[0] : param) === '1';
}

/**
 * Decides how the card picks its hero (FR-6.2). A dev `?variant=` override wins and records no
 * exposure (never in production builds); the creator's own view (`?created=1`) gets control and is
 * not identified, so creators don't count as experiment visitors; real human page views with an
 * `rh_vid` go to Flagsmith; bots, prefetches and requests without an id get control, unidentified.
 */
export function planVariant(
  param: string | string[] | undefined,
  visitor: { kind: 'human' | 'bot' | 'prefetch'; visitorId: string | null },
  opts: { creator?: boolean } = {},
): VariantPlan {
  const forced = devVariantOverride(param);
  if (forced) return { source: 'forced', variant: forced };
  if (opts.creator) return { source: 'creator', variant: CONTROL };
  if (visitor.kind === 'human' && visitor.visitorId) return { source: 'flagsmith', visitorId: visitor.visitorId };
  return { source: 'control', variant: CONTROL };
}
