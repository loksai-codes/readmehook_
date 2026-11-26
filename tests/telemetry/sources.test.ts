import { describe, expect, it } from 'vitest';
import { sourceRate, toSourceCounts } from '@/lib/telemetry/sources';

describe('toSourceCounts', () => {
  it('reads src_* fields from a Redis hash and ignores the rest', () => {
    const c = toSourceCounts({ views: 99, src_views: '40', src_clone_box: '6', src_github_cta: 3, src_quickstart_copy: 'x' });
    expect(c).toEqual({ views: 40, bySource: { clone_box: 6, quickstart_copy: 0, github_cta: 3 } });
  });

  it('is all zeros for a missing hash', () => {
    expect(toSourceCounts(null)).toEqual({ views: 0, bySource: { clone_box: 0, quickstart_copy: 0, github_cta: 0 } });
  });
});

describe('sourceRate', () => {
  it('divides by source-tracked views, null without views', () => {
    expect(sourceRate(toSourceCounts({ src_views: 40, src_clone_box: 6 }), 'clone_box')).toBe(0.15);
    expect(sourceRate(toSourceCounts({ src_clone_box: 6 }), 'clone_box')).toBeNull();
  });
});
