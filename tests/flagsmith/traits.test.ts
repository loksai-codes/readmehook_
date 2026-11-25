import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHeroTraits, devVariantOverride, resolveVariantForMilestone2 } from '@/lib/flagsmith/traits';
import { makeSnapshot } from '../helpers';

afterEach(() => vi.unstubAllEnvs());

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
    expect(resolveVariantForMilestone2('demo_gif_first')).toBe('demo_gif_first');
  });

  it('ignores unknown values → control', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(devVariantOverride('banana')).toBeNull();
    expect(resolveVariantForMilestone2('banana')).toBe('architecture_first');
    expect(resolveVariantForMilestone2(undefined)).toBe('architecture_first');
  });

  it('is disabled in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(devVariantOverride('quickstart_first')).toBeNull();
    expect(resolveVariantForMilestone2('quickstart_first')).toBe('architecture_first');
  });
});
