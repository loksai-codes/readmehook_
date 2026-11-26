import { describe, expect, it } from 'vitest';
import { assignmentFields, toAssignmentCounts } from '@/lib/telemetry/assignment';

describe('assignmentFields', () => {
  it('maps each assignment to the Redis fields it increments', () => {
    expect(assignmentFields({ variant: 'quickstart_first', source: 'flagsmith', exposed: true })).toEqual([
      'assign_flagsmith',
      'assign_exposed',
    ]);
    expect(assignmentFields({ variant: 'quickstart_first', source: 'flagsmith', exposed: false })).toEqual([
      'assign_flagsmith',
    ]);
    expect(assignmentFields({ variant: 'architecture_first', source: 'fallback', reason: 'request_failed' })).toEqual([
      'assign_fallback',
      'fallback_request_failed',
    ]);
  });
});

describe('toAssignmentCounts', () => {
  it('reads the fields back, zero when missing', () => {
    expect(
      toAssignmentCounts({
        views: 8,
        assign_flagsmith: '5',
        assign_exposed: 4,
        assign_fallback: '3',
        fallback_request_failed: '3',
      }),
    ).toEqual({
      flagsmith: 5,
      exposed: 4,
      fallback: 3,
      byReason: { no_client: 0, request_failed: 3, flag_missing: 0, flag_disabled: 0, unknown_value: 0 },
    });
    expect(toAssignmentCounts(null).fallback).toBe(0);
  });
});
