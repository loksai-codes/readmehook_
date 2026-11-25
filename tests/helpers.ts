import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, RepoSnapshot } from '@/lib/github/types';

export function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

export function makeSnapshot(
  overrides: { readme?: string; manifests?: Manifest[] } & Partial<RepoSnapshot['meta']> = {},
): Pick<RepoSnapshot, 'meta' | 'readme' | 'manifests'> {
  const { readme = '', manifests = [], ...meta } = overrides;
  return {
    readme,
    manifests,
    meta: {
      owner: 'acme',
      repo: 'widget',
      fullName: `${meta.owner ?? 'acme'}/${meta.repo ?? 'widget'}`,
      description: null,
      stars: 0,
      language: null,
      topics: [],
      defaultBranch: 'main',
      homepage: null,
      htmlUrl: 'https://github.com/acme/widget',
      avatarUrl: '',
      ...meta,
    },
  };
}
