/**
 * Pure helpers for scripts/simulate-traffic.ts (unit-tested). No network, no process access here:
 * everything the guard needs is passed in.
 */
import { HERO_LAYOUTS, type HeroLayout } from '../lib/flagsmith/variants';

export const SIM_PREFIX = 'sim:';

export interface SimOptions {
  base: string;
  repos: string[];
  visitors: number;
  /** Visitors started per second. */
  rate: number;
  seed: number;
  /** Per-variant probability that a visitor copies the clone command. */
  copy: Record<HeroLayout, number>;
  /** Per-variant probability that a visitor clicks through to GitHub. */
  outbound: Record<HeroLayout, number>;
  /** Per-variant probability that a visitor who did not convert leaves within 5 s. */
  bounce: Record<HeroLayout, number>;
  allowRemote: boolean;
}

/**
 * Made-up rates for exercising the pipeline. They are NOT a prediction and must never be reported as
 * results (scripts/README.md).
 */
export const DEFAULT_RATES = {
  copy: { architecture_first: 0.1, quickstart_first: 0.16, demo_gif_first: 0.12 },
  outbound: { architecture_first: 0.06, quickstart_first: 0.07, demo_gif_first: 0.08 },
  bounce: { architecture_first: 0.25, quickstart_first: 0.22, demo_gif_first: 0.2 },
} satisfies Record<'copy' | 'outbound' | 'bounce', Record<HeroLayout, number>>;

function parseRates(value: string, base: Record<HeroLayout, number>): Record<HeroLayout, number> {
  const out = { ...base };
  for (const part of value.split(',').filter(Boolean)) {
    const [variant, raw] = part.split('=');
    const n = Number(raw);
    if (!HERO_LAYOUTS.includes(variant as HeroLayout) || !Number.isFinite(n) || n < 0 || n > 1) {
      throw new Error(`Bad rate "${part}": expected <variant>=<0..1> with variant in ${HERO_LAYOUTS.join(', ')}`);
    }
    out[variant as HeroLayout] = n;
  }
  return out;
}

export function parseArgs(argv: string[]): SimOptions {
  const opts: SimOptions = {
    base: 'http://localhost:3000',
    repos: ['vercel/next.js'],
    visitors: 100,
    rate: 5,
    seed: 1,
    copy: { ...DEFAULT_RATES.copy },
    outbound: { ...DEFAULT_RATES.outbound },
    bounce: { ...DEFAULT_RATES.bounce },
    allowRemote: false,
  };
  const args = argv.filter((a) => a !== '--');
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (flag === '--allow-remote') {
      opts.allowRemote = true;
      continue;
    }
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    i++;
    switch (flag) {
      case '--base':
        opts.base = value.replace(/\/+$/, '');
        break;
      case '--repos':
        opts.repos = value.split(',').map((r) => r.trim()).filter(Boolean);
        if (!opts.repos.every((r) => /^[A-Za-z0-9-_.]{1,100}\/[A-Za-z0-9-_.]{1,100}$/.test(r))) {
          throw new Error('--repos must be a comma-separated list of owner/repo');
        }
        break;
      case '--visitors':
      case '--rate':
      case '--seed': {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} must be a positive number`);
        if (flag === '--visitors') opts.visitors = Math.floor(n);
        else if (flag === '--rate') opts.rate = n;
        else opts.seed = Math.floor(n);
        break;
      }
      case '--copy':
        opts.copy = parseRates(value, opts.copy);
        break;
      case '--outbound':
        opts.outbound = parseRates(value, opts.outbound);
        break;
      case '--bounce':
        opts.bounce = parseRates(value, opts.bounce);
        break;
      default:
        throw new Error(`Unknown flag ${flag}`);
    }
  }
  return opts;
}

export function isLocalBase(base: string): boolean {
  try {
    const { hostname } = new URL(base);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Returns the reason to refuse, or null to proceed (CLAUDE.md rule 12, NFR-6). The script's own env
 * must say development + sim:, the target must be local (unless explicitly allowed), and the target
 * server itself must report the sim: prefix, because it is the server's env that decides which
 * Flagsmith environment and Redis keys get the traffic.
 */
export function refusalReason(input: {
  envName: string | undefined;
  prefix: string | undefined;
  base: string;
  allowRemote: boolean;
  serverPrefix: string | null;
}): string | null {
  if (input.envName !== 'development') {
    return `FLAGSMITH_ENV_NAME must be "development" (got ${JSON.stringify(input.envName ?? null)})`;
  }
  if (input.prefix !== SIM_PREFIX) {
    return `TELEMETRY_PREFIX must be "${SIM_PREFIX}" (got ${JSON.stringify(input.prefix ?? null)})`;
  }
  if (!input.allowRemote && !isLocalBase(input.base)) {
    return `--base ${input.base} is not localhost; pass --allow-remote only for a non-production dev deploy`;
  }
  if (input.serverPrefix !== SIM_PREFIX) {
    return `the server at ${input.base} is not running with TELEMETRY_PREFIX=${SIM_PREFIX} (it reports ${JSON.stringify(input.serverPrefix)}). Start it with TELEMETRY_PREFIX=${SIM_PREFIX} and the Development Flagsmith key`;
  }
  return null;
}

/** The prefix /insights renders in its data-telemetry-prefix attribute, or "" when none is shown. */
export function serverPrefixFromInsights(html: string): string {
  return html.match(/data-telemetry-prefix="([^"]*)"/)?.[1] ?? '';
}

/** The variant the card rendered, from the shared shell's data-variant attribute. */
export function variantFromHtml(html: string): HeroLayout | null {
  const v = html.match(/data-variant="([a-z_]+)"/)?.[1];
  return HERO_LAYOUTS.includes(v as HeroLayout) ? (v as HeroLayout) : null;
}

/** rh_vid from Set-Cookie header values. */
export function visitorIdFromSetCookie(setCookies: string[]): string | null {
  for (const c of setCookies) {
    const m = c.match(/^rh_vid=([^;]+)/);
    if (m) return m[1]!;
  }
  return null;
}

/** Deterministic PRNG (mulberry32) so a run can be reproduced with --seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SimEvent = 'card_view' | 'clone_command_copied' | 'github_outbound_click' | 'developer_intent' | 'bounce_under_5s';

/** One visitor's events, in the order the real client would send them. */
export function planVisitor(variant: HeroLayout, opts: Pick<SimOptions, 'copy' | 'outbound' | 'bounce'>, rand: () => number): SimEvent[] {
  const events: SimEvent[] = ['card_view'];
  const copied = rand() < opts.copy[variant];
  const clicked = rand() < opts.outbound[variant];
  if (copied) events.push('clone_command_copied', 'developer_intent');
  if (clicked) events.push('github_outbound_click');
  if (clicked && !copied) events.push('developer_intent');
  if (!copied && !clicked && rand() < opts.bounce[variant]) events.push('bounce_under_5s');
  return events;
}

/** `?ref=` mix so referrer_source varies like real traffic. */
export function pickRef(rand: () => number): string | null {
  const r = rand();
  if (r < 0.4) return 'discord';
  if (r < 0.55) return 'twitter';
  return null;
}
