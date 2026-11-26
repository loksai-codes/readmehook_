import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getExperimentFlag = vi.fn();
const trackEvent = vi.fn();
const flushEvents = vi.fn();
const ctor = vi.fn();
vi.mock('@flagsmith/nodejs', () => ({
  Flagsmith: class {
    constructor(opts: unknown) {
      ctor(opts);
    }
    getExperimentFlag = getExperimentFlag;
    trackEvent = trackEvent;
    flushEvents = flushEvents;
  },
}));

async function load() {
  vi.resetModules();
  const [evaluate, track, flush] = await Promise.all([
    import('@/lib/flagsmith/evaluate'),
    import('@/lib/flagsmith/track'),
    import('@/lib/flagsmith/flush'),
  ]);
  return { ...evaluate, ...track, ...flush };
}

const VID = '3b241101-e2bb-4255-8caf-4136c566a962';

/** A flag as getExperimentFlag returns it; enrolled + variant set means the SDK recorded an exposure. */
const flag = (value: unknown, extra: Record<string, unknown> = {}) => ({
  enabled: true,
  isDefault: false,
  value,
  variant: typeof value === 'string' ? value : undefined,
  experiment: { id: 485, name: 'Hero layout', inExperiment: true },
  ...extra,
});
const traits = {
  repo_language: 'TypeScript',
  has_demo_video: false,
  has_mermaid_diagram: true,
  referrer_source: 'direct' as const,
  repo_slug: 'acme/widget',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('FLAGSMITH_SERVER_KEY', 'ser.test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Flagsmith client', () => {
  it('enables events and turns off the background flush timer (serverless)', async () => {
    const { evaluateHeroLayout } = await load();
    getExperimentFlag.mockResolvedValue(flag('architecture_first'));
    await evaluateHeroLayout(VID, traits);
    expect(ctor).toHaveBeenCalledWith(
      expect.objectContaining({
        environmentKey: 'ser.test',
        enableEvents: true,
        logger: expect.objectContaining({ warn: expect.any(Function), error: expect.any(Function) }),
        eventProcessorConfig: expect.objectContaining({ flushInterval: 0 }),
      }),
    );
  });

  it('logs which key a cold start uses, as a fingerprint only', async () => {
    vi.stubEnv('FLAGSMITH_SERVER_KEY', 'ser.abcdefghijklmnopqrstXXAu');
    vi.stubEnv('FLAGSMITH_ENV_NAME', 'production');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { evaluateHeroLayout } = await load();
    getExperimentFlag.mockResolvedValue(flag('architecture_first'));
    await evaluateHeroLayout(VID, traits);
    const lines = info.mock.calls.map((c) => String(c[0])).join(' ');
    expect(lines).toContain('env=production key=ser.…XXAu (len 28)');
    expect(lines).not.toContain('abcdefghij');
  });
});

describe('evaluateHeroLayout', () => {
  it('uses the experiment-flag API with the rh_vid identity and traits', async () => {
    const { evaluateHeroLayout } = await load();
    getExperimentFlag.mockResolvedValue(flag('quickstart_first'));
    expect(await evaluateHeroLayout(VID, traits)).toEqual({
      variant: 'quickstart_first',
      source: 'flagsmith',
      exposed: true,
    });
    expect(getExperimentFlag).toHaveBeenCalledWith('repo_hero_layout', VID, traits);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falls back to control with a reason, and logs every fallback', async () => {
    const { evaluateHeroLayout } = await load();
    const cases: [unknown, string][] = [
      [flag('control'), 'unknown_value'],
      [flag('quickstart_first', { enabled: false }), 'flag_disabled'],
      [{ enabled: false, isDefault: true, value: undefined }, 'flag_missing'],
    ];
    for (const [result, reason] of cases) {
      getExperimentFlag.mockResolvedValueOnce(result);
      expect(await evaluateHeroLayout(VID, traits)).toEqual({ variant: 'architecture_first', source: 'fallback', reason });
    }
    getExperimentFlag.mockRejectedValueOnce(
      new Error('getIdentityFlags failed and no default flag handler was provided', {
        cause: new Error('Invalid request made to Flagsmith API. Response status code: 401'),
      }),
    );
    expect(await evaluateHeroLayout(VID, traits)).toEqual({
      variant: 'architecture_first',
      source: 'fallback',
      reason: 'request_failed',
    });
    const logged = vi.mocked(console.error).mock.calls.map((c) => String(c[0]));
    expect(logged).toHaveLength(4);
    expect(logged.at(-1)).toContain('reason=request_failed');
    expect(logged.at(-1)).toContain('status code: 401');
  });

  it('flags a Flagsmith variant that recorded no exposure (identity not enrolled)', async () => {
    const { evaluateHeroLayout } = await load();
    getExperimentFlag.mockResolvedValueOnce(flag('quickstart_first', { experiment: undefined }));
    expect(await evaluateHeroLayout(VID, traits)).toEqual({
      variant: 'quickstart_first',
      source: 'flagsmith',
      exposed: false,
    });
    expect(String(vi.mocked(console.warn).mock.calls[0]?.[0])).toContain('no exposure recorded');
  });

  it('serves control without a server key and never constructs the client', async () => {
    vi.stubEnv('FLAGSMITH_SERVER_KEY', '');
    const { evaluateHeroLayout, trackFlagsmithEvent } = await load();
    expect(await evaluateHeroLayout(VID, traits)).toEqual({
      variant: 'architecture_first',
      source: 'fallback',
      reason: 'no_client',
    });
    expect(trackFlagsmithEvent(VID, 'card_view')).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });
});

describe('trackFlagsmithEvent + flushFlagsmith', () => {
  it('tracks for the identity and never throws', async () => {
    const { trackFlagsmithEvent } = await load();
    expect(trackFlagsmithEvent(VID, 'developer_intent')).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith('developer_intent', { identifier: VID });
    trackEvent.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(trackFlagsmithEvent(VID, 'developer_intent')).toBe(false);
  });

  it('caps the flush wait and swallows errors', async () => {
    const { flushFlagsmith } = await load();
    flushEvents.mockReturnValueOnce(new Promise(() => {}));
    const t0 = Date.now();
    await flushFlagsmith(20);
    expect(Date.now() - t0).toBeLessThan(500);
    flushEvents.mockRejectedValueOnce(new Error('network'));
    await expect(flushFlagsmith(20)).resolves.toBeUndefined();
  });
});
