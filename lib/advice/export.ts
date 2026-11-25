/** FR-8.2 "Copy optimized README hero" Markdown. PURE: the card URL is passed in. */
import type { RepoMeta } from '@/lib/github/types';
import type { ParsedReadme } from '@/lib/parser/types';
import { escapeInline, fence, oneLine } from './markdown';

type ExportMeta = Pick<RepoMeta, 'owner' | 'repo' | 'description' | 'language'>;
type ExportParsed = Pick<ParsedReadme, 'quickstart' | 'architecture' | 'media' | 'hasMermaid'>;

function pitch(meta: ExportMeta): string {
  if (meta.description?.trim()) return escapeInline(oneLine(meta.description));
  return meta.language ? `A ${escapeInline(meta.language)} project.` : 'One line on what this does and who it is for.';
}

function badges(meta: ExportMeta): string {
  const slug = `${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}`;
  return [
    `![GitHub stars](https://img.shields.io/github/stars/${slug}?style=flat)`,
    `![Top language](https://img.shields.io/github/languages/top/${slug})`,
    `![Last commit](https://img.shields.io/github/last-commit/${slug})`,
  ].join(' ');
}

/**
 * Title, one-line pitch, badge line, quickstart block, then the visual: the README's own Mermaid
 * diagram if it has one, else its demo media, else a generated starter diagram. Ends with a link back
 * to the ReadmeHook card.
 */
export function exportHeroMarkdown(meta: ExportMeta, parsed: ExportParsed, cardUrl: string): string {
  const visual =
    !parsed.hasMermaid && parsed.media
      ? `![${escapeInline(meta.repo)} demo](${parsed.media.url})`
      : `## How it works\n\n${fence(parsed.architecture.diagram.code, 'mermaid')}`;

  return [
    `# ${escapeInline(meta.repo)}`,
    `> ${pitch(meta)}`,
    badges(meta),
    `## Quickstart\n\n${fence(parsed.quickstart.command, parsed.quickstart.lang || 'bash')}`,
    visual,
    `[Would you clone this? Open the ReadmeHook card](${cardUrl})`,
  ].join('\n\n') + '\n';
}
