import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const get = vi.fn();
const set = vi.fn();
const ctor = vi.fn();
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(opts: unknown) {
      ctor(opts);
    }
    get = get;
    set = set;
  },
}));

async function load() {
  vi.resetModules();
  return import('@/lib/redis/client');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('redis client', () => {
  it('uses Upstash with the configured URL/token and a TTL on writes', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
    get.mockResolvedValue({ a: 1 });
    const { cacheGetJSON, cacheSetJSON } = await load();

    expect(await cacheGetJSON('k')).toEqual({ a: 1 });
    await cacheSetJSON('k', { a: 1 }, 900);

    expect(ctor).toHaveBeenCalledWith({ url: 'https://example.upstash.io', token: 'tok' });
    expect(set).toHaveBeenCalledWith('k', { a: 1 }, { ex: 900 });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falls back to no cache and logs once when a key is missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const { cacheGetJSON, cacheSetJSON } = await load();

    expect(await cacheGetJSON('k')).toBeNull();
    await cacheSetJSON('k', 1, 900);
    expect(await cacheGetJSON('k')).toBeNull();

    expect(ctor).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.error).mock.calls[0]![0]).toMatch(/UPSTASH_REDIS_REST_TOKEN is not set/);
  });

  it('swallows runtime Redis errors (fail open)', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
    get.mockRejectedValue(new Error('boom'));
    set.mockRejectedValue(new Error('boom'));
    const { cacheGetJSON, cacheSetJSON } = await load();

    expect(await cacheGetJSON('k')).toBeNull();
    await expect(cacheSetJSON('k', 1, 900)).resolves.toBeUndefined();
  });
});
