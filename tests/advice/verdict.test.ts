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
  it('names the leader, flags a guardrail breach and low sample', () => {
    const v = verdict(armStats({ architecture_first: c(20, 2, 2), quickstart_first: c(20, 6, 8) }));
    expect(v.headline).toBe('quickstart_first leads on developer intent: 30% vs 10% for architecture_first');
    expect(v.guardrailWarnings).toEqual([
      'quickstart_first bounces faster than control: 40% of visitors left within 5 s vs 10%',
    ]);
    expect(v.lowSample).toBe(true);
    expect(v.totalViews).toBe(40);
  });

  it('reports a tie and no low-sample flag at 30+ per arm', () => {
    const v = verdict(armStats({ architecture_first: c(30, 3, 3), quickstart_first: c(30, 3, 3) }));
    expect(v.headline).toBe('No difference in developer intent yet (10% in both arms)');
    expect(v.lowSample).toBe(false);
    expect(v.guardrailWarnings).toEqual([]);
  });

  it('needs views in both arms', () => {
    expect(verdict(armStats({ architecture_first: c(12, 1, 0) })).headline).toBe(
      'Not enough views in both arms to compare yet',
    );
  });
});

describe('formatRate', () => {
  it('rounds to one decimal and dashes missing values', () => {
    expect(formatRate(0.1234)).toBe('12.3%');
    expect(formatRate(null)).toBe('–');
  });
});
