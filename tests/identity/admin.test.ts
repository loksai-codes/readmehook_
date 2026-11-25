import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminCookieFor, isAdminCookie, safeEqual } from '@/lib/identity/admin';

afterEach(() => vi.unstubAllEnvs());

describe('admin gate (FR-10.5)', () => {
  it('issues a hashed cookie only for the right token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'correct horse battery staple');
    const cookie = await adminCookieFor('correct horse battery staple');
    expect(cookie).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie).not.toContain('horse');
    expect(await adminCookieFor('wrong')).toBeNull();
    expect(await adminCookieFor('')).toBeNull();
    expect(await isAdminCookie(cookie)).toBe(true);
    expect(await isAdminCookie('0'.repeat(64))).toBe(false);
  });

  it('is disabled entirely when ADMIN_TOKEN is unset', async () => {
    vi.stubEnv('ADMIN_TOKEN', '');
    expect(await adminCookieFor('')).toBeNull();
    expect(await adminCookieFor('anything')).toBeNull();
    expect(await isAdminCookie('anything')).toBe(false);
  });

  it('safeEqual compares exactly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
  });
});
