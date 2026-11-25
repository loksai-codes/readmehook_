export class InvalidRepoSlugError extends Error {
  constructor(owner: string, repo: string) {
    super(`Invalid repo slug: ${owner}/${repo}`);
    this.name = 'InvalidRepoSlugError';
  }
}

/** 404, or a private repo (GitHub returns 404 for both). FR-2.6. */
export class RepoNotFoundError extends Error {
  constructor(slug: string) {
    super(`Repo not found or private: ${slug}`);
    this.name = 'RepoNotFoundError';
  }
}

/** 403/429 with an exhausted rate limit. FR-2.6. */
export class RateLimitedError extends Error {
  constructor(public readonly resetAt: Date | null) {
    super('GitHub rate limit exceeded');
    this.name = 'RateLimitedError';
  }
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}
