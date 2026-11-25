import 'server-only';
import { RateLimitedError, RepoNotFoundError } from './errors';
import { isValidSlug } from './slug';
import { getRepoSnapshot } from './snapshot';
import type { RepoSnapshot } from './types';

export type RepoLoad = { ok: true; snapshot: RepoSnapshot } | { ok: false; title: string; body: string };

/**
 * Page-friendly snapshot load (FR-1.4, FR-2.6): validates the slug, maps GitHub failures to a
 * friendly notice and never throws, so no page 500s on a GitHub problem (CLAUDE.md rule 10).
 */
export async function loadRepoForPage(owner: string, repo: string): Promise<RepoLoad> {
  if (!isValidSlug(owner, repo)) {
    return { ok: false, title: "That doesn't look like a GitHub repo", body: `"${owner}/${repo}" isn't a valid owner/repo.` };
  }
  try {
    const { snapshot } = await getRepoSnapshot(owner, repo);
    return { ok: true, snapshot };
  } catch (err) {
    if (err instanceof RepoNotFoundError) {
      return { ok: false, title: 'Repo not found or private', body: `We couldn't find a public repo at ${owner}/${repo}.` };
    }
    if (err instanceof RateLimitedError) {
      return { ok: false, title: 'GitHub is rate-limiting us', body: 'Try again in a minute.' };
    }
    console.error('[github] snapshot failed', err);
    return { ok: false, title: "GitHub didn't answer", body: 'Something went wrong fetching this repo. Try again shortly.' };
  }
}
