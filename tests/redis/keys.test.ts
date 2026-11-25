import { afterEach, describe, expect, it, vi } from 'vitest';
import { keys } from '@/lib/redis/keys';

afterEach(() => vi.unstubAllEnvs());

describe('redis keys', () => {
  it('lowercases GitHub cache keys and never prefixes them', () => {
    vi.stubEnv('TELEMETRY_PREFIX', 'sim:');
    expect(keys.ghSnapshot('Vercel', 'Next.js')).toBe('gh:vercel/next.js');
    expect(keys.ghStale('Vercel', 'Next.js')).toBe('gh:stale:vercel/next.js');
  });

  it('prefixes telemetry keys with TELEMETRY_PREFIX', () => {
    vi.stubEnv('TELEMETRY_PREFIX', 'sim:');
    expect(keys.repoVariant('acme/w', 'quickstart_first')).toBe('sim:repo:acme/w:variant:quickstart_first');
    expect(keys.repoVariantUniq('acme/w', 'quickstart_first', 'intent')).toBe(
      'sim:repo:acme/w:variant:quickstart_first:uniq:intent',
    );
    expect(keys.expVariant('architecture_first')).toBe('sim:exp:variant:architecture_first');
    expect(keys.expLangVariant('TypeScript', 'architecture_first')).toBe(
      'sim:exp:lang:typescript:variant:architecture_first',
    );
    expect(keys.rateLimit('abc')).toBe('sim:rl:abc');
    expect(keys.expLangs()).toBe('sim:exp:langs');
  });

  it('uses no prefix by default', () => {
    vi.stubEnv('TELEMETRY_PREFIX', '');
    expect(keys.expVariant('x')).toBe('exp:variant:x');
  });
});
