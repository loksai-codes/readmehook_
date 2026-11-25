import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RATES,
  isLocalBase,
  parseArgs,
  planVisitor,
  refusalReason,
  rng,
  serverPrefixFromInsights,
  variantFromHtml,
  visitorIdFromSetCookie,
} from '../../scripts/simulate-lib';

const ok = { envName: 'development', prefix: 'sim:', base: 'http://localhost:3000', allowRemote: false, serverPrefix: 'sim:' };

describe('refusalReason (CLAUDE.md rule 12, NFR-6)', () => {
  it('proceeds only for development + sim: + local server reporting sim:', () => {
    expect(refusalReason(ok)).toBeNull();
  });
  it('refuses production or a missing env name', () => {
    expect(refusalReason({ ...ok, envName: 'production' })).toMatch(/FLAGSMITH_ENV_NAME/);
    expect(refusalReason({ ...ok, envName: undefined })).toMatch(/FLAGSMITH_ENV_NAME/);
  });
  it('refuses any prefix other than sim:', () => {
    expect(refusalReason({ ...ok, prefix: '' })).toMatch(/TELEMETRY_PREFIX/);
    expect(refusalReason({ ...ok, prefix: 'dev:' })).toMatch(/TELEMETRY_PREFIX/);
  });
  it('refuses a remote base unless explicitly allowed', () => {
    expect(refusalReason({ ...ok, base: 'https://readmehook.vercel.app' })).toMatch(/not localhost/);
    expect(refusalReason({ ...ok, base: 'https://dev.example.com', allowRemote: true })).toBeNull();
  });
  it('refuses when the target server is not on sim: (e.g. a production server)', () => {
    expect(refusalReason({ ...ok, serverPrefix: '' })).toMatch(/server/);
    expect(refusalReason({ ...ok, serverPrefix: null })).toMatch(/server/);
    expect(refusalReason({ ...ok, serverPrefix: 'dev:' })).toMatch(/server/);
  });
});

describe('parseArgs', () => {
  it('parses the README example', () => {
    const o = parseArgs(['--', '--base', 'http://localhost:3000/', '--repos', 'vercel/next.js,astral-sh/uv', '--visitors', '200', '--rate', '5']);
    expect(o).toMatchObject({ base: 'http://localhost:3000', repos: ['vercel/next.js', 'astral-sh/uv'], visitors: 200, rate: 5 });
    expect(o.copy).toEqual(DEFAULT_RATES.copy);
  });
  it('overrides per-variant rates', () => {
    expect(parseArgs(['--copy', 'quickstart_first=0.3']).copy.quickstart_first).toBe(0.3);
  });
  it('rejects bad input', () => {
    expect(() => parseArgs(['--copy', 'banana=0.3'])).toThrow(/Bad rate/);
    expect(() => parseArgs(['--copy', 'quickstart_first=2'])).toThrow(/Bad rate/);
    expect(() => parseArgs(['--repos', 'not a repo'])).toThrow(/owner\/repo/);
    expect(() => parseArgs(['--visitors'])).toThrow(/Missing value/);
    expect(() => parseArgs(['--nope', '1'])).toThrow(/Unknown flag/);
  });
});

describe('page parsing', () => {
  it('reads the variant, the rh_vid cookie and the server prefix', () => {
    expect(variantFromHtml('<article class="x" data-variant="quickstart_first">')).toBe('quickstart_first');
    expect(variantFromHtml('<article data-variant="banana">')).toBeNull();
    expect(visitorIdFromSetCookie(['other=1', 'rh_vid=abc-123; Path=/; HttpOnly'])).toBe('abc-123');
    expect(visitorIdFromSetCookie([])).toBeNull();
    expect(serverPrefixFromInsights('<p class="x" data-telemetry-prefix="sim:">Reading counters under prefix sim:</p>')).toBe('sim:');
    expect(serverPrefixFromInsights('<p>no prefix line</p>')).toBe('');
  });
  it('recognises local bases', () => {
    expect(isLocalBase('http://localhost:3000')).toBe(true);
    expect(isLocalBase('http://127.0.0.1:3200')).toBe(true);
    expect(isLocalBase('https://readmehook.example')).toBe(false);
    expect(isLocalBase('not a url')).toBe(false);
  });
});

describe('planVisitor', () => {
  const always = { copy: { ...DEFAULT_RATES.copy, quickstart_first: 1 }, outbound: DEFAULT_RATES.outbound, bounce: DEFAULT_RATES.bounce };
  it('copy implies intent once, and no bounce', () => {
    const events = planVisitor('quickstart_first', { ...always, outbound: { ...DEFAULT_RATES.outbound, quickstart_first: 1 } }, rng(1));
    expect(events).toEqual(['card_view', 'clone_command_copied', 'developer_intent', 'github_outbound_click']);
  });
  it('a non-converting visitor may bounce', () => {
    const never = { copy: { ...DEFAULT_RATES.copy, architecture_first: 0 }, outbound: { ...DEFAULT_RATES.outbound, architecture_first: 0 }, bounce: { ...DEFAULT_RATES.bounce, architecture_first: 1 } };
    expect(planVisitor('architecture_first', never, rng(1))).toEqual(['card_view', 'bounce_under_5s']);
  });
  it('rng is deterministic per seed', () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
