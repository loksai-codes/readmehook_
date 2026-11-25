/**
 * All Redis key builders. Layout: docs/architecture.md#redis-keys.
 * Telemetry keys are prefixed with TELEMETRY_PREFIX ("" in prod, "sim:" for simulation).
 * GitHub cache keys are shared and never prefixed.
 */

function prefix(): string {
  return process.env.TELEMETRY_PREFIX ?? '';
}

/** GitHub is case-insensitive for owner/repo, so cache keys are lowercased. */
export function repoSlugKey(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase();
}

export const keys = {
  /** RepoSnapshot cache, 900 s. */
  ghSnapshot: (owner: string, repo: string) => `gh:${repoSlugKey(owner, repo)}`,
  /** Stale RepoSnapshot fallback, 24 h. */
  ghStale: (owner: string, repo: string) => `gh:stale:${repoSlugKey(owner, repo)}`,

  /** Cached byte size of a demo media URL (FR-4.5 size cap), 24 h. */
  mediaSize: (url: string) => `media:size:${url}`,

  /** Hash of per-variant counters for one repo. `slug` = `owner/repo`. */
  repoVariant: (slug: string, variant: string) =>
    `${prefix()}repo:${slug.toLowerCase()}:variant:${variant}`,
  /** Set of visitor ids already counted for a metric. */
  repoVariantUniq: (slug: string, variant: string, metric: string) =>
    `${prefix()}repo:${slug.toLowerCase()}:variant:${variant}:uniq:${metric}`,

  /** Global per-variant totals. */
  expVariant: (variant: string) => `${prefix()}exp:variant:${variant}`,
  /** Per-language per-variant totals. */
  expLangVariant: (lang: string, variant: string) =>
    `${prefix()}exp:lang:${lang.toLowerCase()}:variant:${variant}`,

  /** Per-visitor rate-limit counter, 60 s window. */
  rateLimit: (visitorId: string) => `${prefix()}rl:${visitorId}`,
} as const;

export const TTL = {
  GH_SNAPSHOT_S: 900,
  GH_STALE_S: 24 * 60 * 60,
  RATE_LIMIT_S: 60,
} as const;
