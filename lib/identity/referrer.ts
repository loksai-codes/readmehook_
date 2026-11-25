/** FR-6.5 referrer_source. Pure. */
import type { HeroTraits } from '@/lib/flagsmith/variants';

export type ReferrerSource = HeroTraits['referrer_source'];

const REF_PARAM_MAP: Record<string, ReferrerSource> = {
  discord: 'discord',
  twitter: 'twitter',
  x: 'twitter',
  direct: 'direct',
};

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * `?ref=` wins; otherwise map the Referer host. A Referer from our own site (e.g. the `/` form)
 * counts as `direct`.
 */
export function referrerSource(
  refParam: string | string[] | null | undefined,
  refererHeader: string | null | undefined,
  selfHost?: string | null,
): ReferrerSource {
  const ref = (Array.isArray(refParam) ? refParam[0] : refParam)?.trim().toLowerCase();
  if (ref) return REF_PARAM_MAP[ref] ?? 'other';

  if (!refererHeader) return 'direct';
  let host: string;
  try {
    host = new URL(refererHeader).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  if (!host) return 'direct';
  if (selfHost && host === selfHost.toLowerCase().replace(/:\d+$/, '')) return 'direct';
  if (hostMatches(host, ['discord.com', 'discordapp.com', 'discordapp.net', 'discord.gg'])) return 'discord';
  if (hostMatches(host, ['t.co', 'x.com', 'twitter.com'])) return 'twitter';
  return 'other';
}
