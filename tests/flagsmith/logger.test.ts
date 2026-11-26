import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { errorMessage, flagsmithLogger, keyFingerprint } = await import('@/lib/flagsmith/logger');

afterEach(() => vi.restoreAllMocks());

const log = flagsmithLogger as unknown as Record<string, (...a: unknown[]) => unknown>;

describe('flagsmithLogger (SDK adapter)', () => {
  it('turns SDK warn/error calls into plain prefixed console lines', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log.error!(
      'Flagsmith events API refused the environment key with status 401. Dropping 2 events and no longer tracking events.',
    );
    log.error!(new Error('boom', { cause: new Error('status 401') }), 'getIdentityFlags failed');
    log.warn!('Flagsmith events API rejected 3 events with status 400. Dropping them.');
    expect(error.mock.calls[0]?.[0]).toBe(
      '[flagsmith-sdk] Flagsmith events API refused the environment key with status 401. Dropping 2 events and no longer tracking events.',
    );
    expect(error.mock.calls[1]?.[0]).toBe('[flagsmith-sdk] Error: boom <- Error: status 401 | getIdentityFlags failed');
    expect(warn.mock.calls[0]?.[0]).toContain('[flagsmith-sdk] Flagsmith events API rejected 3 events');
  });

  it('drops debug/info and supports child()', () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    log.debug!('Not recording an exposure');
    log.info!('hello');
    expect(log.child!()).toBe(flagsmithLogger);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});

describe('keyFingerprint', () => {
  it('shows only the prefix, last 4 characters and length', () => {
    expect(keyFingerprint('ser.abcdefghijklmnopqrstuvwxAu')).toBe('ser.…wxAu (len 30)');
    expect(keyFingerprint('"ser.abc"')).toBe('(no ser. prefix) …abc" (len 9)');
  });
});

describe('errorMessage', () => {
  it('follows the cause chain', () => {
    expect(errorMessage(new Error('a', { cause: new Error('b') }))).toBe('Error: a <- Error: b');
    expect(errorMessage('plain')).toBe('plain');
  });
});
