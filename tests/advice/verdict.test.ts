import { describe, expect, it } from 'vitest';
import { armStats, formatRate, guardrailStatus, toCounters, verdict } from '@/lib/advice/verdict';

const c = (views: number, intent: number, bounces: number) => ({ views, clones: 0, outbound: 0, intent, bounces });

describe('toCounters', () => {
  it('coerces Redis strings, ignores junk and missing fields', () => {
    expect(toCounters({ views: '12', intent: 3, bounces: 'x', extra: 9 })).toEqual({
      views: 12,
      clones: 0,
      outbound: 0,
      intent: 3,
      bounces: 0,
    });
    expect(toCounters(null)).toEqual({ views: 0, clones: 0, outbound: 0, intent: 0, bounces: 0 });
  });
});

describe('armStats', () => {
  it('computes rates, control first, and hides a 0-view demo arm', () => {
    const arms = armStats({ architecture_first: c(40, 6, 8), quickstart_first: c(50, 12, 9) });
    expect(arms.map((a) => a.variant)).toEqual(['architecture_first', 'quickstart_first']);
    expect(arms[0]).toMatchObject({ n: 40, intentRate: 0.15, bounceRate: 0.2, guardrail: 'baseline' });
    expect(arms[1]).toMatchObject({ n: 50, intentRate: 0.24, bounceRate: 0.18, guardrail: 'ok' });
  });

  it('shows the demo arm once it has views', () => {
    const arms = armStats({ architecture_first: c(10, 1, 1), demo_gif_first: c(3, 1, 0) });
    expect(arms.map((a) => a.variant)).toEqual(['architecture_first', 'quickstart_first', 'demo_gif_first']);
    expect(arms[1]).toMatchObject({ n: 0, intentRate: null, bounceRate: null });
  });
});

describe('guardrailStatus (FR-8.3, FR-10.3)', () => {
  it('breaches above 1.5x control', () => {
    expect(guardrailStatus(0.31, 0.2)).toBe('breach');
    expect(guardrailStatus(0.3, 0.2)).toBe('watch');
  });
  it('watches more than 2 points above control', () => {
    expect(guardrailStatus(0.23, 0.2)).toBe('watch');
    expect(guardrailStatus(0.22, 0.2)).toBe('ok');
    expect(guardrailStatus(0.1, 0.2)).toBe('ok');
  });
  it('uses 5 points when control has no bounces', () => {
    expect(guardrailStatus(0.06, 0)).toBe('breach');
    expect(guardrailStatus(0.04, 0)).toBe('watch');
  });
  it('is ok without data', () => {
    expect(guardrailStatus(null, 0.2)).toBe('ok');
    expect(guardrailStatus(0.5, null)).toBe('ok');
  });
});

describe('verdict', () => {
  it('never names a leader below 30 per arm, but still flags a guardrail breach', () => {
    const v = verdict(armStats({ architecture_first: c(20, 2, 2), quickstart_first: c(20, 6, 8) }), {
      winProbability: { variant: 'quickstart_first', probability: 0.97 },
    });
    expect(v.headline).toBe('Collecting data: n = 20 vs 20, too early to call');
    expect(v.leader).toBeNull();
    expect(v.guardrailWarnings).toEqual([
      'quickstart_first bounces faster than control: 40% of visitors left within 5 s vs 10%',
    ]);
    expect(v.lowSample).toBe(true);
    expect(v.totalViews).toBe(40);
  });

  it('is too early when one arm is below 30, even if the other is large', () => {
    expect(verdict(armStats({ architecture_first: c(120, 1, 0), quickstart_first: c(29, 9, 0) })).headline).toBe(
      'Collecting data: n = 120 vs 29, too early to call',
    );
    expect(verdict(armStats({ architecture_first: c(12, 1, 0) })).headline).toBe(
      'Collecting data: n = 12 vs 0, too early to call',
    );
  });

  it('at 30+ per arm, names the leader only with the Flagsmith win probability', () => {
    const arms = armStats({ architecture_first: c(40, 4, 3), quickstart_first: c(30, 6, 3) });
    const v = verdict(arms, { winProbability: { variant: 'quickstart_first', probability: 0.914 } });
    expect(v.headline).toBe(
      'quickstart_first leads on developer intent with a 91% win probability in Flagsmith (intent 20% quickstart_first vs 10% architecture_first)',
    );
    expect(v.leader).toBe('quickstart_first');
    expect(v.lowSample).toBe(false);
    expect(v.guardrailWarnings).toEqual([]);
  });

  it('at 30+ per arm without a win probability, names no leader even when raw rates differ', () => {
    const arms = armStats({ architecture_first: c(30, 3, 3), quickstart_first: c(30, 9, 3) });
    for (const winProbability of [undefined, null]) {
      expect(verdict(arms, { winProbability }).headline).toBe(
        "n = 30 vs 30. No leader named without Flagsmith's win probability; raw numbers below",
      );
      expect(verdict(arms, { winProbability }).leader).toBeNull();
    }
  });
});

describe('formatRate', () => {
  it('rounds to one decimal and dashes missing values', () => {
    expect(formatRate(0.1234)).toBe('12.3%');
    expect(formatRate(null)).toBe('–');
  });
});
