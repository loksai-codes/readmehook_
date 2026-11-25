import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const repoJson = {
  name: 'widget',
  full_name: 'acme/widget',
  description: 'A widget',
  stargazers_count: 7,
  language: 'TypeScript',
  topics: ['cli'],
  default_branch: 'main',
  homepage: '',
  html_url: 'https://github.com/acme/widget',
  owner: { login: 'acme', avatar_url: 'https://avatars.example/acme' },
};

function respond(url: string): Response {
  if (url.endsWith('/readme')) {
    return Response.json({ content: Buffer.from('# widget\n').toString('base64'), encoding: 'base64' });
  }
  if (url.endsWith('/contents/')) {
    return Response.json([
      { name: 'package.json', type: 'file' },
      { name: 'Dockerfile', type: 'file' },
      { name: 'src', type: 'dir' },
    ]);
  }
  return Response.json(repoJson);
}

const fetchMock = vi.fn((input: string | URL | Request) => Promise.resolve(respond(String(input))));

async function load() {
  vi.resetModules();
  return import('@/lib/github/client');
}

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function authHeaders(): (string | undefined)[] {
  return fetchMock.mock.calls.map((c) => {
    const init = (c as unknown[])[1] as RequestInit;
    return (init.headers as Record<string, string>).Authorization;
  });
}

describe('fetchRepoSnapshot (FR-2)', () => {
  it('authenticates every request with GITHUB_TOKEN and builds a snapshot', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'ghp_test');
    const { fetchRepoSnapshot } = await load();
    const snap = await fetchRepoSnapshot('acme', 'widget');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(authHeaders()).toEqual(['Bearer ghp_test', 'Bearer ghp_test', 'Bearer ghp_test']);
    expect(snap).toMatchObject({
      readme: '# widget\n',
      manifests: ['package.json', 'Dockerfile'],
      meta: { fullName: 'acme/widget', stars: 7, homepage: null, defaultBranch: 'main' },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('falls back to unauthenticated requests and logs once when the token is missing', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const { fetchRepoSnapshot } = await load();
    await fetchRepoSnapshot('acme', 'widget');
    await fetchRepoSnapshot('acme', 'widget');

    expect(authHeaders().every((h) => h === undefined)).toBe(true);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.error).mock.calls[0]![0]).toMatch(/GITHUB_TOKEN is not set/);
  });

  it('maps 404 to RepoNotFoundError and exhausted rate limit to RateLimitedError', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'ghp_test');
    const { fetchRepoSnapshot } = await load();
    const { RepoNotFoundError, RateLimitedError } = await import('@/lib/github/errors');

    fetchMock.mockImplementation(() => Promise.resolve(new Response('{}', { status: 404 })));
    await expect(fetchRepoSnapshot('acme', 'nope')).rejects.toBeInstanceOf(RepoNotFoundError);

    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })),
    );
    await expect(fetchRepoSnapshot('acme', 'widget')).rejects.toBeInstanceOf(RateLimitedError);
  });
});
