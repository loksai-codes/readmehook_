/**
 * Where each visit's variant came from, as Redis hash fields. PURE.
 *
 * Recorded server-side when the card renders (never from the client), deduplicated per visitor per
 * repo, on the same per-variant hashes as the live counters. Lets /insights and the write-up tell
 * real Flagsmith assignments from control fallbacks, which otherwise look identical in `views`.
 */
import { FALLBACK_REASONS, type FallbackReason, type HeroAssignment } from '@/lib/flagsmith/variants';

export const ASSIGN_FLAGSMITH_FIELD = 'assign_flagsmith';
export const ASSIGN_EXPOSED_FIELD = 'assign_exposed';
export const ASSIGN_FALLBACK_FIELD = 'assign_fallback';

export function fallbackField(reason: FallbackReason): string {
  return `fallback_${reason}`;
}

/** The fields one visit increments (each deduplicated separately). */
export function assignmentFields(a: HeroAssignment): string[] {
  if (a.source === 'fallback') return [ASSIGN_FALLBACK_FIELD, fallbackField(a.reason)];
  return a.exposed ? [ASSIGN_FLAGSMITH_FIELD, ASSIGN_EXPOSED_FIELD] : [ASSIGN_FLAGSMITH_FIELD];
}

export interface AssignmentCounts {
  /** Visitors whose variant Flagsmith decided. */
  flagsmith: number;
  /** Of those, visitors for whom the SDK recorded an exposure. */
  exposed: number;
  /** Visitors served control because Flagsmith gave no usable answer. */
  fallback: number;
  byReason: Record<FallbackReason, number>;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function toAssignmentCounts(hash: Record<string, unknown> | null | undefined): AssignmentCounts {
  return {
    flagsmith: num(hash?.[ASSIGN_FLAGSMITH_FIELD]),
    exposed: num(hash?.[ASSIGN_EXPOSED_FIELD]),
    fallback: num(hash?.[ASSIGN_FALLBACK_FIELD]),
    byReason: Object.fromEntries(FALLBACK_REASONS.map((r) => [r, num(hash?.[fallbackField(r)])])) as Record<
      FallbackReason,
      number
    >,
  };
}
