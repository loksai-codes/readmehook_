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

/** Milestone 2: no Flagsmith yet, so every visitor gets control unless overridden in dev. */
export function resolveVariantForMilestone2(param: string | string[] | undefined): HeroLayout {
  return devVariantOverride(param) ?? CONTROL;
}
