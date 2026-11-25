import { describe, expect, it } from 'vitest';
import { isBot } from '@/lib/identity/bots';
import { referrerSource } from '@/lib/identity/referrer';
import { classifyRequest, isPrefetchRequest } from '@/lib/identity/request';
import { isValidVisitorId, newVisitorId, visitorCookieOptions } from '@/lib/identity/visitorId';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

function hdrs(init: Record<string, string>) {
  return new Headers(init);
}

describe('isBot (FR-5.3)', () => {
  it.each([
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'LinkedInBot/1.0',
    'TelegramBot (like TwitterBot)',
    'WhatsApp/2.23.20.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36',
    'curl/8.4.0',
    'python-requests/2.31.0',
    'node-fetch/1.0',
    '',
  ])('flags %j', (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it('flags a missing UA', () => {
    expect(isBot(null)).toBe(true);
    expect(isBot(undefined)).toBe(true);
  });

  it.each([CHROME, SAFARI_IOS, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:132.0) Gecko/20100101 Firefox/132.0'])(
    'lets real browsers through: %s',
    (ua) => {
      expect(isBot(ua)).toBe(false);
    },
  );
});

describe('referrerSource (FR-6.5)', () => {
  it('?ref= wins over Referer', () => {
    expect(referrerSource('discord', 'https://t.co/abc')).toBe('discord');
    expect(referrerSource('Twitter', null)).toBe('twitter');
    expect(referrerSource('x', null)).toBe('twitter');
    expect(referrerSource('direct', 'https://discord.com/channels/1')).toBe('direct');
    expect(referrerSource('reddit', null)).toBe('other');
    expect(referrerSource(['discord', 'twitter'], null)).toBe('discord');
  });

  it.each([
    ['https://discord.com/channels/1/2', 'discord'],
    ['https://canary.discord.com/channels/1/2', 'discord'],
    ['https://discordapp.com/', 'discord'],
    ['https://t.co/xyz', 'twitter'],
    ['https://x.com/someone/status/1', 'twitter'],
    ['https://mobile.twitter.com/', 'twitter'],
    ['https://news.ycombinator.com/', 'other'],
    ['https://notdiscord.com/', 'other'],
  ] as const)('Referer %s → %s', (referer, expected) => {
    expect(referrerSource(undefined, referer)).toBe(expected);
  });

  it('no Referer, garbage Referer, or our own host → direct', () => {
    expect(referrerSource(undefined, null)).toBe('direct');
    expect(referrerSource('', '')).toBe('direct');
    expect(referrerSource(undefined, 'not a url')).toBe('direct');
    expect(referrerSource(undefined, 'http://localhost:3000/', 'localhost:3000')).toBe('direct');
  });
});

describe('request classification', () => {
  it('detects browser and Next prefetches', () => {
    expect(isPrefetchRequest(hdrs({ purpose: 'prefetch' }))).toBe(true);
    expect(isPrefetchRequest(hdrs({ 'sec-purpose': 'prefetch;prerender' }))).toBe(true);
    expect(isPrefetchRequest(hdrs({ 'next-router-prefetch': '1' }))).toBe(true);
    expect(isPrefetchRequest(hdrs({}))).toBe(false);
  });

  it('classifies bot before prefetch, human otherwise', () => {
    expect(classifyRequest(hdrs({ 'user-agent': 'Discordbot/2.0', purpose: 'prefetch' }))).toBe('bot');
    expect(classifyRequest(hdrs({ 'user-agent': CHROME, purpose: 'prefetch' }))).toBe('prefetch');
    expect(classifyRequest(hdrs({ 'user-agent': CHROME }))).toBe('human');
  });
});

describe('visitor id (FR-5.1)', () => {
  it('mints valid v4 UUIDs and rejects anything else', () => {
    const id = newVisitorId();
    expect(isValidVisitorId(id)).toBe(true);
    expect(newVisitorId()).not.toBe(id);
    expect(isValidVisitorId('not-a-uuid')).toBe(false);
    expect(isValidVisitorId('00000000-0000-1000-8000-000000000000')).toBe(false); // v1
    expect(isValidVisitorId(undefined)).toBe(false);
  });

  it('cookie is HTTP-only, SameSite=Lax, 1 year', () => {
    expect(visitorCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 31_536_000 });
  });
});
