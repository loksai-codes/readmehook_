import 'server-only';
import { cacheGetJSON, cacheSetJSON } from '@/lib/redis/client';
import { keys, TTL } from '@/lib/redis/keys';
import { fetchRepoSnapshot } from './client';
import { InvalidRepoSlugError, RepoNotFoundError } from './errors';
import { isValidSlug } from './slug';
import type { RepoSnapshot } from './types';

export type CacheStatus = 'hit' | 'miss' | 'stale';

export interface SnapshotResult {
  snapshot: RepoSnapshot;
  cache: CacheStatus;
}

/**
 * FR-2.5: cached RepoSnapshot. Fresh cache 900 s; on GitHub failure (other than 404)
 * serve the 24 h stale copy if one exists. Redis failures degrade to a direct GitHub fetch.
 */
export async function getRepoSnapshot(owner: string, repo: string): Promise<SnapshotResult> {
  if (!isValidSlug(owner, repo)) throw new InvalidRepoSlugError(owner, repo);

  const freshKey = keys.ghSnapshot(owner, repo);
  const staleKey = keys.ghStale(owner, repo);

  const cached = await cacheGetJSON<RepoSnapshot>(freshKey);
  if (cached) return { snapshot: cached, cache: 'hit' };

  try {
    const snapshot = await fetchRepoSnapshot(owner, repo);
    await Promise.all([
      cacheSetJSON(freshKey, snapshot, TTL.GH_SNAPSHOT_S),
      cacheSetJSON(staleKey, snapshot, TTL.GH_STALE_S),
    ]);
    return { snapshot, cache: 'miss' };
  } catch (err) {
    if (!(err instanceof RepoNotFoundError)) {
      const stale = await cacheGetJSON<RepoSnapshot>(staleKey);
      if (stale) {
        console.warn(`[github] serving stale snapshot for ${owner}/${repo}`, err);
        return { snapshot: stale, cache: 'stale' };
      }
    }
    throw err;
  }
}
