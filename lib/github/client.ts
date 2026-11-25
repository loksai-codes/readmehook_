import 'server-only';
import { z } from 'zod';
import { serverEnv } from '@/lib/env';
import { GitHubError, RateLimitedError, RepoNotFoundError } from './errors';
import { MANIFESTS, type Manifest, type RepoSnapshot } from './types';

const API = 'https://api.github.com';
const TIMEOUT_MS = 8000;

const repoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  stargazers_count: z.number(),
  language: z.string().nullable(),
  topics: z.array(z.string()).optional().default([]),
  default_branch: z.string(),
  homepage: z.string().nullable(),
  html_url: z.string(),
  private: z.boolean().optional(),
  owner: z.object({ login: z.string(), avatar_url: z.string() }),
});

const readmeSchema = z.object({
  content: z.string(),
  encoding: z.string(),
});

const contentsSchema = z.array(z.object({ name: z.string(), type: z.string() }));

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'readmehook',
  };
  const token = serverEnv('GITHUB_TOKEN', 'GitHub requests are unauthenticated (60 req/h limit)');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh(path: string): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    throw new RateLimitedError(Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null);
  }
  if (res.status === 429) throw new RateLimitedError(null);
  return res;
}

async function json(res: Response, what: string): Promise<unknown> {
  if (!res.ok) throw new GitHubError(`GitHub ${what} failed: ${res.status}`, res.status);
  return res.json();
}

/** FR-2.2: README Markdown, or "" if the repo has none. */
async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await gh(`/repos/${owner}/${repo}/readme`);
  if (res.status === 404) return '';
  const data = readmeSchema.parse(await json(res, 'readme'));
  if (data.encoding !== 'base64') return data.content;
  return Buffer.from(data.content, 'base64').toString('utf8');
}

/** FR-2.3: which known manifests sit in the repo root. Non-fatal on failure. */
async function fetchManifests(owner: string, repo: string): Promise<Manifest[]> {
  try {
    const res = await gh(`/repos/${owner}/${repo}/contents/`);
    if (!res.ok) return [];
    const parsed = contentsSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    const names = new Set(parsed.data.filter((e) => e.type === 'file').map((e) => e.name));
    return MANIFESTS.filter((m) => names.has(m));
  } catch (err) {
    if (err instanceof RateLimitedError) throw err;
    return [];
  }
}

/** Fetches metadata, README and root manifests straight from GitHub (no cache). FR-2.1–2.4. */
export async function fetchRepoSnapshot(owner: string, repo: string): Promise<RepoSnapshot> {
  const slug = `${owner}/${repo}`;
  const [repoRes, readme, manifests] = await Promise.all([
    gh(`/repos/${owner}/${repo}`),
    fetchReadme(owner, repo).catch((err: unknown) => {
      if (err instanceof RateLimitedError) throw err;
      return null;
    }),
    fetchManifests(owner, repo),
  ]);

  if (repoRes.status === 404) throw new RepoNotFoundError(slug);
  const meta = repoSchema.parse(await json(repoRes, 'repo'));
  if (meta.private) throw new RepoNotFoundError(slug);
  if (readme === null) throw new GitHubError(`GitHub readme failed for ${slug}`);

  return {
    meta: {
      owner: meta.owner.login,
      repo: meta.name,
      fullName: meta.full_name,
      description: meta.description,
      stars: meta.stargazers_count,
      language: meta.language,
      topics: meta.topics,
      defaultBranch: meta.default_branch,
      homepage: meta.homepage || null,
      htmlUrl: meta.html_url,
      avatarUrl: meta.owner.avatar_url,
    },
    readme,
    manifests,
    fetchedAt: new Date().toISOString(),
  };
}
