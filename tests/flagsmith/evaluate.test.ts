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
    getExperimentFlag.mockResolvedValue({ enabled: true, value: 'architecture_first' });
    await evaluateHeroLayout(VID, traits);
    expect(ctor).toHaveBeenCalledWith(
      expect.objectContaining({
        environmentKey: 'ser.test',
        enableEvents: true,
        eventProcessorConfig: expect.objectContaining({ flushInterval: 0 }),
      }),
    );
  });
});

describe('evaluateHeroLayout', () => {
  it('uses the experiment-flag API with the rh_vid identity and traits', async () => {
    const { evaluateHeroLayout } = await load();
    getExperimentFlag.mockResolvedValue({ enabled: true, value: 'quickstart_first' });
    expect(await evaluateHeroLayout(VID, traits)).toBe('quickstart_first');
    expect(getExperimentFlag).toHaveBeenCalledWith('repo_hero_layout', VID, traits);
  });

  it('falls back to control for unknown values, disabled flags and errors', async () => {
    const { evaluateHeroLayout } = await load();
    getExperimentFlag.mockResolvedValueOnce({ enabled: true, value: 'control' });
    expect(await evaluateHeroLayout(VID, traits)).toBe('architecture_first');
    getExperimentFlag.mockResolvedValueOnce({ enabled: false, value: 'quickstart_first' });
    expect(await evaluateHeroLayout(VID, traits)).toBe('architecture_first');
    getExperimentFlag.mockRejectedValueOnce(new Error('timeout'));
    expect(await evaluateHeroLayout(VID, traits)).toBe('architecture_first');
  });

  it('serves control without a server key and never constructs the client', async () => {
    vi.stubEnv('FLAGSMITH_SERVER_KEY', '');
    const { evaluateHeroLayout, trackFlagsmithEvent } = await load();
    expect(await evaluateHeroLayout(VID, traits)).toBe('architecture_first');
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
