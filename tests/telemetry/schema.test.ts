import { describe, expect, it } from 'vitest';
import { shouldSendBounce } from '@/lib/telemetry/bounce';
import { ALLOWED_EVENTS, EVENTS, isEventName } from '@/lib/telemetry/events';
import { MAX_TRACK_BODY_BYTES, parseTrackBody } from '@/lib/telemetry/schema';

const ok = { event: 'clone_command_copied', repoSlug: 'vercel/next.js', variant: 'quickstart_first' };

describe('event contract', () => {
  it('matches the Flagsmith metric event names exactly', () => {
    expect([...ALLOWED_EVENTS].sort()).toEqual(
      ['bounce_under_5s', 'card_view', 'clone_command_copied', 'developer_intent', 'github_outbound_click'].sort(),
    );
    expect(isEventName(EVENTS.DEVELOPER_INTENT)).toBe(true);
    expect(isEventName('Developer_Intent')).toBe(false);
    expect(isEventName(42)).toBe(false);
  });
});

describe('parseTrackBody', () => {
  it('accepts an allow-listed event, owner/repo slug and known variant', () => {
    expect(parseTrackBody(JSON.stringify(ok))).toEqual(ok);
  });

  it('rejects unknown events, bad slugs, unknown variants and junk', () => {
    expect(parseTrackBody(JSON.stringify({ ...ok, event: 'purchase' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, event: 'CARD_VIEW' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, repoSlug: 'vercel' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, repoSlug: 'a/b/c' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, repoSlug: '../etc' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, variant: 'control' }))).toBeNull();
    expect(parseTrackBody('not json')).toBeNull();
    expect(parseTrackBody('')).toBeNull();
  });

  it('never takes the identity from the body', () => {
    expect(parseTrackBody(JSON.stringify({ ...ok, visitorId: '3b241101-e2bb-4255-8caf-4136c566a962' }))).toBeNull();
  });

  it('accepts a source that matches its event (Redis confound check)', () => {
    expect(parseTrackBody(JSON.stringify({ ...ok, source: 'clone_box' }))).toEqual({ ...ok, source: 'clone_box' });
    expect(parseTrackBody(JSON.stringify({ ...ok, source: 'quickstart_copy' }))).not.toBeNull();
    expect(
      parseTrackBody(JSON.stringify({ ...ok, event: 'github_outbound_click', source: 'github_cta' })),
    ).not.toBeNull();
  });

  it('rejects unknown sources and sources on the wrong event', () => {
    expect(parseTrackBody(JSON.stringify({ ...ok, source: 'hero' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, source: 'github_cta' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, event: 'developer_intent', source: 'clone_box' }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({ ...ok, event: 'card_view', source: 'clone_box' }))).toBeNull();
  });

  it('rejects oversized bodies before parsing', () => {
    expect(parseTrackBody(JSON.stringify({ ...ok, pad: 'x'.repeat(MAX_TRACK_BODY_BYTES) }))).toBeNull();
  });
});

describe('shouldSendBounce (FR-7.4)', () => {
  it('fires under 5 s without a conversion', () => {
    expect(shouldSendBounce({ elapsedMs: 4999, converted: false, alreadySent: false })).toBe(true);
  });
  it('does not fire at or after 5 s', () => {
    expect(shouldSendBounce({ elapsedMs: 5000, converted: false, alreadySent: false })).toBe(false);
  });
  it('does not fire after a conversion', () => {
    expect(shouldSendBounce({ elapsedMs: 1000, converted: true, alreadySent: false })).toBe(false);
  });
  it('fires at most once', () => {
    expect(shouldSendBounce({ elapsedMs: 1000, converted: false, alreadySent: true })).toBe(false);
  });
});
