/**
 * Confound check (judge review): unique visitors per conversion source, per arm. PURE.
 *
 * The treatment hero adds a second copy button, so `clone_command_copied` has more surfaces in
 * quickstart_first. The clone box and GitHub CTA are identical in both arms, so their rates are the
 * fair, layout-only comparison. Live Redis counters, not a significance test.
 */
import { CONVERSION_SOURCES, SOURCE_VIEWS_FIELD, sourceField, type ConversionSource } from './events';

export interface SourceCounts {
  /** Card views counted since source tracking shipped (the denominator for every rate here). */
  views: number;
  bySource: Record<ConversionSource, number>;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Reads the `src_*` fields of a per-variant Redis hash. Missing or junk fields count as 0. */
export function toSourceCounts(hash: Record<string, unknown> | null | undefined): SourceCounts {
  return {
    views: num(hash?.[SOURCE_VIEWS_FIELD]),
    bySource: Object.fromEntries(CONVERSION_SOURCES.map((s) => [s, num(hash?.[sourceField(s)])])) as Record<
      ConversionSource,
      number
    >,
  };
}

/** Share of source-tracked visitors who used `source` at least once; null when there are no views. */
export function sourceRate(counts: SourceCounts, source: ConversionSource): number | null {
  return counts.views > 0 ? Math.min(1, counts.bySource[source] / counts.views) : null;
}
