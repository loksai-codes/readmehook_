/**
 * FR-8.3 / FR-10: Stage 2 verdict from the Redis live counters. PURE.
 *
 * Counters are unique visitors per metric (SADD-deduplicated), so `views` is n and each rate is
 * "share of visitors who did X at least once". These are live counters, not a significance test:
 * the Flagsmith results page is the source of truth (FR-10.4).
 */
import { CONTROL, type HeroLayout } from '@/lib/flagsmith/variants';

export interface ArmCounters {
  views: number;
  clones: number;
  outbound: number;
  intent: number;
  bounces: number;
}

export const EMPTY_COUNTERS: ArmCounters = { views: 0, clones: 0, outbound: 0, intent: 0, bounces: 0 };

/** Stage 2 shows once a repo has this many views across arms (FR-8.3). */
export const STAGE2_MIN_VIEWS = 10;
/** Below this many views in any shown arm, the verdict carries a low-sample warning (FR-8.3). */
export const LOW_SAMPLE_PER_ARM = 30;
/** Guardrail: bounce rate above this multiple of control is a breach (FR-8.3)… */
export const BREACH_RATIO = 1.5;
/** …or, when control has no bounces yet, more than this many points above it (experiment plan: ~5 pp). */
export const BREACH_POINTS = 0.05;
/** Above control by more than this, but not a breach: watch. */
export const WATCH_POINTS = 0.02;

export type GuardrailStatus = 'baseline' | 'ok' | 'watch' | 'breach';

export interface ArmStats {
  variant: HeroLayout;
  n: number;
  intent: number;
  bounces: number;
  /** 0..1, null when n = 0. */
  intentRate: number | null;
  bounceRate: number | null;
  guardrail: GuardrailStatus;
}

/** Coerces a Redis hash (string or number values, missing fields) into counters. */
export function toCounters(hash: Record<string, unknown> | null | undefined): ArmCounters {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return {
    views: num(hash?.views),
    clones: num(hash?.clones),
    outbound: num(hash?.outbound),
    intent: num(hash?.intent),
    bounces: num(hash?.bounces),
  };
}

function rate(part: number, n: number): number | null {
  return n > 0 ? Math.min(1, part / n) : null;
}

export function guardrailStatus(bounceRate: number | null, controlBounceRate: number | null): Exclude<GuardrailStatus, 'baseline'> {
  if (bounceRate === null || controlBounceRate === null) return 'ok';
  const diff = bounceRate - controlBounceRate;
  if (controlBounceRate > 0 ? bounceRate > controlBounceRate * BREACH_RATIO && diff > 0 : diff > BREACH_POINTS) {
    return 'breach';
  }
  return diff > WATCH_POINTS ? 'watch' : 'ok';
}

/**
 * Per-arm stats in a stable order (control first). Phase 1 arms always appear; any other arm only
 * once it has views, so a 0% `demo_gif_first` doesn't clutter the table.
 */
export function armStats(
  counters: Partial<Record<HeroLayout, ArmCounters>>,
  alwaysShow: readonly HeroLayout[] = [CONTROL, 'quickstart_first'],
  order: readonly HeroLayout[] = ['architecture_first', 'quickstart_first', 'demo_gif_first'],
): ArmStats[] {
  const control = counters[CONTROL] ?? EMPTY_COUNTERS;
  const controlBounce = rate(control.bounces, control.views);
  return order
    .filter((v) => alwaysShow.includes(v) || (counters[v]?.views ?? 0) > 0)
    .map((variant) => {
      const c = counters[variant] ?? EMPTY_COUNTERS;
      const bounceRate = rate(c.bounces, c.views);
      return {
        variant,
        n: c.views,
        intent: c.intent,
        bounces: c.bounces,
        intentRate: rate(c.intent, c.views),
        bounceRate,
        guardrail: variant === CONTROL ? 'baseline' : guardrailStatus(bounceRate, controlBounce),
      };
    });
}

export function formatRate(r: number | null): string {
  return r === null ? '–' : `${Math.round(r * 1000) / 10}%`;
}

/**
 * Flagsmith's win probability for the primary metric: the arm it reports as most likely best and
 * that probability (0..1). Experiment-wide only; there is no per-repo win probability.
 */
export interface WinProbability {
  variant: HeroLayout;
  probability: number;
}

export function formatProbability(p: number): string {
  return `${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`;
}

export interface Verdict {
  /**
   * One sentence. Below LOW_SAMPLE_PER_ARM in any arm it never names a leader. At or above it, a
   * leader is named only with Flagsmith's win probability, never from raw rates alone.
   */
  headline: string;
  /** The arm named as leader (only with 30+ per arm and a Flagsmith win probability), else null. */
  leader: HeroLayout | null;
  /** Guardrail warnings, one per breaching arm. */
  guardrailWarnings: string[];
  lowSample: boolean;
  totalViews: number;
}

export function verdict(arms: ArmStats[], opts: { winProbability?: WinProbability | null } = {}): Verdict {
  const totalViews = arms.reduce((s, a) => s + a.n, 0);
  const lowSample = arms.some((a) => a.n < LOW_SAMPLE_PER_ARM);

  let headline: string;
  let named: HeroLayout | null = null;
  const leader = opts.winProbability ? arms.find((a) => a.variant === opts.winProbability!.variant) : undefined;
  if (lowSample) {
    headline = `Collecting data: n = ${arms.map((a) => a.n).join(' vs ')}, too early to call`;
  } else if (opts.winProbability && leader) {
    const others = arms.filter((a) => a !== leader);
    const rates = [leader, ...others].map((a) => `${formatRate(a.intentRate)} ${a.variant}`).join(' vs ');
    named = leader.variant;
    headline = `${leader.variant} leads on developer intent with a ${formatProbability(opts.winProbability.probability)} win probability in Flagsmith (intent ${rates})`;
  } else {
    headline = `n = ${arms.map((a) => a.n).join(' vs ')}. No leader named without Flagsmith's win probability; raw numbers below`;
  }

  const control = arms.find((a) => a.variant === CONTROL);
  const guardrailWarnings = arms
    .filter((a) => a.guardrail === 'breach')
    .map(
      (a) =>
        `${a.variant} bounces faster than control: ${formatRate(a.bounceRate)} of visitors left within 5 s vs ${formatRate(control?.bounceRate ?? null)}`,
    );

  return { headline, leader: named, guardrailWarnings, lowSample, totalViews };
}
