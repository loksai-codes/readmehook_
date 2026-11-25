/** FR-8.1 Stage 1 README audit. PURE: works on the parsed README and repo meta only. */
import type { RepoMeta } from '@/lib/github/types';
import type { ParsedReadme } from '@/lib/parser/types';
import { fence } from './markdown';

export type AuditCheckId = 'quickstart' | 'architecture' | 'demo-media';

export interface AuditCheck {
  id: AuditCheckId;
  /** True when the README already does this. */
  passed: boolean;
  title: string;
  /** Why it matters / what we found, one or two sentences. */
  detail: string;
  /** Ready-to-paste Markdown that fixes it; null when passed. */
  snippet: string | null;
}

type AuditInput = Pick<
  ParsedReadme,
  'quickstart' | 'architecture' | 'media' | 'hasQuickstart' | 'quickstartInTop30' | 'hasMermaid' | 'hasDemoMedia'
>;

function quickstartCheck(parsed: AuditInput): AuditCheck {
  const block = `## Quickstart\n\n${fence(parsed.quickstart.command, parsed.quickstart.lang || 'bash')}`;
  if (parsed.hasQuickstart && parsed.quickstartInTop30) {
    return {
      id: 'quickstart',
      passed: true,
      title: 'Quickstart in the first 30 lines',
      detail: `A runnable command starts on line ${parsed.quickstart.startLine}, inside the first screen.`,
      snippet: null,
    };
  }
  if (parsed.hasQuickstart) {
    return {
      id: 'quickstart',
      passed: false,
      title: 'Quickstart is below the fold',
      detail: `Your first runnable command starts on line ${parsed.quickstart.startLine}. Move it into the first 30 lines so a visitor can run it without scrolling.`,
      snippet: block,
    };
  }
  return {
    id: 'quickstart',
    passed: false,
    title: 'No copyable quickstart',
    detail: 'The README has no shell block with an install or run command. This one is generated from the repo; check it runs before pasting.',
    snippet: block,
  };
}

function architectureCheck(parsed: AuditInput): AuditCheck {
  if (parsed.hasMermaid) {
    return {
      id: 'architecture',
      passed: true,
      title: 'Architecture diagram',
      detail: 'The README has a Mermaid diagram, which GitHub renders inline.',
      snippet: null,
    };
  }
  return {
    id: 'architecture',
    passed: false,
    title: 'No architecture diagram',
    detail: parsed.architecture.section
      ? `"${parsed.architecture.section.heading}" is prose only. A small Mermaid diagram shows the shape of the system at a glance; edit the labels to match.`
      : 'A small Mermaid diagram shows the shape of the system at a glance. This starter is generated from repo metadata; edit the labels to match.',
    snippet: `## Architecture\n\n${fence(parsed.architecture.diagram.code, 'mermaid')}`,
  };
}

function demoCheck(parsed: AuditInput, meta: Pick<RepoMeta, 'repo'>): AuditCheck {
  if (parsed.hasDemoMedia) {
    return {
      id: 'demo-media',
      passed: true,
      title: 'Demo GIF or video',
      detail: 'The README shows the project running.',
      snippet: null,
    };
  }
  return {
    id: 'demo-media',
    passed: false,
    title: 'No demo GIF or video',
    detail: 'Record 5 to 10 seconds of the project running, keep it under 10 MB, commit it to docs/ and reference it near the top.',
    snippet: `![${meta.repo} demo](docs/demo.gif)`,
  };
}

/** Always returns the three checks in a fixed order: quickstart, architecture, demo media. */
export function audit(parsed: AuditInput, meta: Pick<RepoMeta, 'repo'>): AuditCheck[] {
  return [quickstartCheck(parsed), architectureCheck(parsed), demoCheck(parsed, meta)];
}
