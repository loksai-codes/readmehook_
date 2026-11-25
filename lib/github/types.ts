/** Shared, side-effect-free types for GitHub data. Safe to import from pure modules (lib/parser). */

/** Manifests we look for in the repo root (FR-2.3). */
export const MANIFESTS = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'Dockerfile',
  'docker-compose.yml',
] as const;

export type Manifest = (typeof MANIFESTS)[number];

export interface RepoMeta {
  owner: string;
  repo: string;
  /** Canonical `owner/repo` as GitHub reports it. */
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  defaultBranch: string;
  homepage: string | null;
  htmlUrl: string;
  avatarUrl: string;
}

export interface RepoSnapshot {
  meta: RepoMeta;
  /** Decoded README Markdown; empty string when the repo has no README. */
  readme: string;
  manifests: Manifest[];
  /** ISO timestamp of the GitHub fetch. */
  fetchedAt: string;
}
