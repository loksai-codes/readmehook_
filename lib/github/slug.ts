/** Pure helpers for turning user input into a validated owner/repo pair (FR-1.1, FR-1.4). */

/** FR-1.4: owner and repo must match this before any API call. */
export const SLUG_SEGMENT_RE = /^[A-Za-z0-9-_.]{1,100}$/;

export interface RepoSlug {
  owner: string;
  repo: string;
}

export function isValidSegment(segment: string): boolean {
  return SLUG_SEGMENT_RE.test(segment) && segment !== '.' && segment !== '..';
}

export function isValidSlug(owner: string, repo: string): boolean {
  return isValidSegment(owner) && isValidSegment(repo);
}

/**
 * Accepts `https://github.com/owner/repo`, `github.com/owner/repo`, or `owner/repo`.
 * Strips a trailing `.git`, anything after the repo segment (`/tree/...`), query strings and hashes.
 * Returns null for anything else.
 */
export function parseRepoInput(input: string): RepoSlug | null {
  let s = input.trim();
  if (!s) return null;

  s = s.replace(/[?#].*$/, '');
  s = s.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');

  let parts = s.split('/').filter(Boolean);
  if (parts[0]?.toLowerCase() === 'github.com') {
    parts = parts.slice(1);
  } else if (parts[0]?.includes('.') && parts.length > 2) {
    // Some other host, e.g. gitlab.com/owner/repo.
    return null;
  }
  if (parts.length < 2) return null;

  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/i, '');

  return isValidSlug(owner, repo) ? { owner, repo } : null;
}
