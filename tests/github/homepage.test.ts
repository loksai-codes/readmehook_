import { describe, expect, it } from 'vitest';
import { homepageLink } from '@/lib/github/homepage';

describe('homepageLink', () => {
  it('labels http(s) links without protocol, www or trailing slash', () => {
    expect(homepageLink('https://nextjs.org/')).toEqual({ href: 'https://nextjs.org/', label: 'nextjs.org' });
    expect(homepageLink('https://www.example.com/docs/')).toEqual({
      href: 'https://www.example.com/docs/',
      label: 'example.com/docs',
    });
  });
  it('adds https to bare hosts', () => {
    expect(homepageLink('devpulse.app')).toEqual({ href: 'https://devpulse.app/', label: 'devpulse.app' });
  });
  it('rejects empty and non-web schemes', () => {
    expect(homepageLink(null)).toBeNull();
    expect(homepageLink('  ')).toBeNull();
    expect(homepageLink('javascript:alert(1)')).toBeNull();
    expect(homepageLink('ftp://files.example.com')).toBeNull();
  });
});
