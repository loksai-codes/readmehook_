import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHeroTraits, devVariantOverride, planVariant } from '@/lib/flagsmith/traits';
import { makeSnapshot } from '../helpers';

afterEach(() => vi.unstubAllEnvs());

const VID = '3b241101-e2bb-4255-8caf-4136c566a962';
const HUMAN = { kind: 'human' as const, visitorId: VID };
const BOT = { kind: 'bot' as const, visitorId: null };

describe('buildHeroTraits', () => {
  it('maps snapshot + parsed flags to PRD §5 traits', () => {
    const snap = makeSnapshot({ owner: 'Vercel', repo: 'Next.js', fullName: 'Vercel/Next.js', language: 'TypeScript' });
    expect(buildHeroTraits(snap, { hasDemoMedia: true, hasMermaid: false }, 'discord')).toEqual({
      repo_language: 'TypeScript',
      has_demo_video: true,
      has_mermaid_diagram: false,
      referrer_source: 'discord',
      repo_slug: 'vercel/next.js',
    });
  });

  it('uses "unknown" when GitHub reports no language', () => {
    expect(buildHeroTraits(makeSnapshot(), { hasDemoMedia: false, hasMermaid: false }, 'direct').repo_language).toBe(
      'unknown',
    );
  });
});

describe('dev ?variant= override', () => {
  it('honours known variants outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(devVariantOverride('quickstart_first')).toBe('quickstart_first');
    expect(devVariantOverride(['demo_gif_first'])).toBe('demo_gif_first');
    expect(planVariant('demo_gif_first', HUMAN)).toEqual({ source: 'forced', variant: 'demo_gif_first' });
  });

  it('ignores unknown values → control', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(devVariantOverride('banana')).toBeNull();
    expect(planVariant('banana', BOT)).toEqual({ source: 'control', variant: 'architecture_first' });
  });

  it('is disabled in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(devVariantOverride('quickstart_first')).toBeNull();
    expect(planVariant('quickstart_first', HUMAN)).toEqual({ source: 'flagsmith', visitorId: VID });
  });
});

describe('planVariant', () => {
  it("gives the creator's own view control without identifying them", () => {
    expect(planVariant(undefined, HUMAN, { creator: true })).toEqual({ source: 'creator', variant: 'architecture_first' });
  });

  it('ignores ?variant= in production builds, even for the creator view', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(planVariant('quickstart_first', HUMAN, { creator: true })).toEqual({ source: 'creator', variant: 'architecture_first' });
  });

  it('sends human page views with an rh_vid to Flagsmith', () => {
    expect(planVariant(undefined, HUMAN)).toEqual({ source: 'flagsmith', visitorId: VID });
  });

  it('never identifies bots, prefetches or id-less requests (control, no exposure)', () => {
    for (const visitor of [BOT, { kind: 'prefetch' as const, visitorId: VID }, { kind: 'human' as const, visitorId: null }]) {
      expect(planVariant(undefined, visitor)).toEqual({ source: 'control', variant: 'architecture_first' });
    }
  });
});
