export const FLAG_KEY = 'repo_hero_layout' as const;

export const HERO_LAYOUTS = [
  'architecture_first',
  'quickstart_first',
  'demo_gif_first',
] as const;

export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export const CONTROL: HeroLayout = 'architecture_first';

export function toHeroLayout(value: unknown): HeroLayout {
  return HERO_LAYOUTS.includes(value as HeroLayout) ? (value as HeroLayout) : CONTROL;
}

/** Why a visit was served control without a Flagsmith decision. */
export const FALLBACK_REASONS = ['no_client', 'request_failed', 'flag_missing', 'flag_disabled', 'unknown_value'] as const;
export type FallbackReason = (typeof FALLBACK_REASONS)[number];

/**
 * Where a visit's hero came from. `flagsmith`: Flagsmith decided the variant; `exposed` says whether
 * the SDK recorded an exposure (it doesn't when the identity isn't enrolled, e.g. no running
 * experiment in this environment). `fallback`: Flagsmith gave no usable answer, so control was served.
 */
export type HeroAssignment =
  | { variant: HeroLayout; source: 'flagsmith'; exposed: boolean }
  | { variant: HeroLayout; source: 'fallback'; reason: FallbackReason };

export interface HeroTraits {
  repo_language: string;
  has_demo_video: boolean;
  has_mermaid_diagram: boolean;
  referrer_source: 'discord' | 'twitter' | 'direct' | 'other';
  repo_slug: string;
}
