import { describe, expect, it } from 'vitest';
import { isValidSlug, parseRepoInput } from '@/lib/github/slug';

describe('parseRepoInput (FR-1.1)', () => {
  it.each([
    'https://github.com/vercel/next.js',
    'http://github.com/vercel/next.js',
    'https://www.github.com/vercel/next.js',
    'github.com/vercel/next.js',
    'vercel/next.js',
    '  vercel/next.js  ',
    'https://github.com/vercel/next.js.git',
    'https://github.com/vercel/next.js/',
    'https://github.com/vercel/next.js/tree/canary/packages/next',
    'https://github.com/vercel/next.js?tab=readme-ov-file#getting-started',
    'GitHub.com/vercel/next.js',
  ])('%s → vercel/next.js', (input) => {
    expect(parseRepoInput(input)).toEqual({ owner: 'vercel', repo: 'next.js' });
  });

  it.each(['', 'vercel', 'https://github.com/vercel', 'gitlab.com/a/b', 'a b/c', 'own$er/repo', '../etc'])(
    'rejects %j',
    (input) => {
      expect(parseRepoInput(input)).toBeNull();
    },
  );
});

describe('isValidSlug (FR-1.4)', () => {
  it('enforces ^[A-Za-z0-9-_.]{1,100}$', () => {
    expect(isValidSlug('a-b_c.d', 'x')).toBe(true);
    expect(isValidSlug('a'.repeat(100), 'x')).toBe(true);
    expect(isValidSlug('a'.repeat(101), 'x')).toBe(false);
    expect(isValidSlug('a/b', 'x')).toBe(false);
    expect(isValidSlug('..', 'x')).toBe(false);
  });
});
