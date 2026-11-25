import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const trackFlagsmithEvent = vi.fn();
const flushFlagsmith = vi.fn();
vi.mock('@/lib/flagsmith/track', () => ({ trackFlagsmithEvent: (...a: unknown[]) => trackFlagsmithEvent(...a) }));
vi.mock('@/lib/flagsmith/flush', () => ({ flushFlagsmith: (...a: unknown[]) => flushFlagsmith(...a) }));

const hincrby = vi.fn();
const exec = vi.fn();
const redis = {
  sadd: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  pipeline: () => ({ hincrby, exec }),
};
const getRedis = vi.fn<() => typeof redis | null>(() => redis);
const cacheGetJSON = vi.fn();
vi.mock('@/lib/redis/client', () => ({
  getRedis: () => getRedis(),
  cacheGetJSON: (...a: unknown[]) => cacheGetJSON(...a),
}));

const { recordEvent, isRateLimited } = await import('@/lib/telemetry/server');

const VID = '3b241101-e2bb-4255-8caf-4136c566a962';
const body = { event: 'clone_command_copied', repoSlug: 'Acme/Widget', variant: 'quickstart_first' } as const;

beforeEach(() => {
  vi.clearAllMocks();
  getRedis.mockImplementation(() => redis);
  trackFlagsmithEvent.mockReturnValue(true);
  flushFlagsmith.mockResolvedValue(undefined);
  cacheGetJSON.mockResolvedValue({ meta: { language: 'TypeScript' } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('recordEvent dual-write (FR-7.3)', () => {
  it('sends the event to Flagsmith for the cookie identity and flushes before resolving', async () => {
    redis.sadd.mockResolvedValue(1);
    let flushed = false;
    flushFlagsmith.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5));
      flushed = true;
    });
    await recordEvent(VID, body);
    expect(trackFlagsmithEvent).toHaveBeenCalledWith(VID, 'clone_command_copied');
    expect(flushed).toBe(true);
  });

  it('increments repo, global and language counters on the first occurrence', async () => {
    redis.sadd.mockResolvedValue(1);
    const result = await recordEvent(VID, body);
    expect(redis.sadd).toHaveBeenCalledWith('repo:acme/widget:variant:quickstart_first:uniq:clones', VID);
    expect(hincrby).toHaveBeenCalledWith('repo:acme/widget:variant:quickstart_first', 'clones', 1);
    expect(hincrby).toHaveBeenCalledWith('exp:variant:quickstart_first', 'clones', 1);
    expect(hincrby).toHaveBeenCalledWith('exp:lang:typescript:variant:quickstart_first', 'clones', 1);
    expect(exec).toHaveBeenCalledOnce();
    expect(result).toEqual({ flagsmith: true, redisFirst: true });
  });

  it('does not increment counters on a repeat, but still sends to Flagsmith', async () => {
    redis.sadd.mockResolvedValue(0);
    const result = await recordEvent(VID, body);
    expect(hincrby).not.toHaveBeenCalled();
    expect(trackFlagsmithEvent).toHaveBeenCalledOnce();
    expect(flushFlagsmith).toHaveBeenCalledOnce();
    expect(result.redisFirst).toBe(false);
  });

  it('still sends to Flagsmith when Redis fails', async () => {
    redis.sadd.mockRejectedValue(new Error('down'));
    const result = await recordEvent(VID, body);
    expect(trackFlagsmithEvent).toHaveBeenCalledOnce();
    expect(flushFlagsmith).toHaveBeenCalledOnce();
    expect(result.redisFirst).toBeNull();
  });

  it('skips the flush when Flagsmith is disabled', async () => {
    trackFlagsmithEvent.mockReturnValue(false);
    redis.sadd.mockResolvedValue(1);
    await recordEvent(VID, body);
    expect(flushFlagsmith).not.toHaveBeenCalled();
  });
});

describe('isRateLimited (FR-7.6)', () => {
  it('allows 60 per minute and sets the window on the first hit', async () => {
    redis.incr.mockResolvedValue(1);
    expect(await isRateLimited(VID)).toBe(false);
    expect(redis.expire).toHaveBeenCalledWith('rl:' + VID, 60);
    redis.incr.mockResolvedValue(60);
    expect(await isRateLimited(VID)).toBe(false);
    redis.incr.mockResolvedValue(61);
    expect(await isRateLimited(VID)).toBe(true);
  });

  it('fails open without Redis or on errors', async () => {
    getRedis.mockImplementation(() => null);
    expect(await isRateLimited(VID)).toBe(false);
    getRedis.mockImplementation(() => redis);
    redis.incr.mockRejectedValue(new Error('down'));
    expect(await isRateLimited(VID)).toBe(false);
  });
});
