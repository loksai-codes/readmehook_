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

export interface HeroTraits {
  repo_language: string;
  has_demo_video: boolean;
  has_mermaid_diagram: boolean;
  referrer_source: 'discord' | 'twitter' | 'direct' | 'other';
  repo_slug: string;
}
