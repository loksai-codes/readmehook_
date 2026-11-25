/** Deterministic README parser (FR-3). PURE: no fetch, no Date, no randomness. */
import type { RepoSnapshot } from '@/lib/github/types';
import { extractMedia, extractMermaid, extractQuickstart } from './extract';
import { scanMarkdown } from './markdown';
import { cloneCommand, synthesizeMermaid, synthesizeQuickstart } from './synthesize';
import type { ParsedReadme } from './types';

export * from './extract';
export * from './synthesize';
export type * from './types';

type ParseInput = Pick<RepoSnapshot, 'meta' | 'readme' | 'manifests'>;

export function parseReadme(snapshot: ParseInput): ParsedReadme {
  const { owner, repo, defaultBranch } = snapshot.meta;
  const scanned = scanMarkdown(snapshot.readme);

  const mermaid = extractMermaid(scanned);
  const quickstart = extractQuickstart(scanned);
  const media = extractMedia(scanned, { owner, repo, branch: defaultBranch });

  return {
    architecture: {
      diagram:
        mermaid?.kind === 'mermaid'
          ? { code: mermaid.code, source: 'extracted' }
          : { code: synthesizeMermaid(snapshot), source: 'synthesized' },
      section: mermaid?.kind === 'section' ? { heading: mermaid.heading, text: mermaid.text } : null,
    },
    quickstart: quickstart
      ? { command: quickstart.command, source: 'extracted', lang: quickstart.lang, startLine: quickstart.startLine }
      : { command: synthesizeQuickstart(snapshot), source: 'synthesized', lang: null, startLine: null },
    media: media ? { ...media, source: 'extracted' } : null,
    cloneCommand: cloneCommand(owner, repo),
    hasMermaid: mermaid?.kind === 'mermaid',
    hasDemoMedia: media !== null,
    hasQuickstart: quickstart !== null,
    quickstartInTop30: quickstart?.inTop30 ?? false,
  };
}
