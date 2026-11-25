import { describe, expect, it } from 'vitest';
import { audit } from '@/lib/advice/audit';
import { exportHeroMarkdown } from '@/lib/advice/export';
import { escapeInline, fence, oneLine } from '@/lib/advice/markdown';
import { cardUrl, discordPrompt } from '@/lib/advice/share';
import { parseReadme } from '@/lib/parser';
import { fixture, makeSnapshot } from '../helpers';

function parsedFrom(name: string, extra: Parameters<typeof makeSnapshot>[0] = {}) {
  const snap = makeSnapshot({ readme: fixture(name), manifests: ['package.json'], ...extra });
  return { snap, parsed: parseReadme(snap) };
}

const byId = (checks: ReturnType<typeof audit>) => Object.fromEntries(checks.map((c) => [c.id, c]));

describe('audit (FR-8.1)', () => {
  it('with-mermaid: quickstart and diagram pass, demo media missing', () => {
    const { snap, parsed } = parsedFrom('with-mermaid.md');
    const checks = audit(parsed, snap.meta);
    expect(checks.map((c) => c.id)).toEqual(['quickstart', 'architecture', 'demo-media']);
    const c = byId(checks);
    expect(c.quickstart).toMatchObject({ passed: true, snippet: null });
    expect(c.architecture).toMatchObject({ passed: true, snippet: null });
    expect(c['demo-media']).toMatchObject({ passed: false, snippet: '![widget demo](docs/demo.gif)' });
  });

  it('quickstart-below-fold: flags the quickstart with its line and a paste-ready block', () => {
    const { snap, parsed } = parsedFrom('quickstart-below-fold.md');
    const q = byId(audit(parsed, snap.meta)).quickstart!;
    expect(q.passed).toBe(false);
    expect(q.title).toBe('Quickstart is below the fold');
    expect(q.detail).toContain(`line ${parsed.quickstart.startLine}`);
    expect(q.snippet).toBe(`## Quickstart\n\n\`\`\`bash\n${parsed.quickstart.command}\n\`\`\``);
  });

  it('empty README: all three fail with generated snippets', () => {
    const { snap, parsed } = parsedFrom('empty.md', { language: 'TypeScript' });
    const checks = audit(parsed, snap.meta);
    expect(checks.every((c) => !c.passed && c.snippet)).toBe(true);
    const c = byId(checks);
    expect(c.quickstart!.title).toBe('No copyable quickstart');
    expect(c.quickstart!.snippet).toContain('git clone https://github.com/acme/widget.git && cd widget');
    expect(c.architecture!.snippet).toMatch(/^## Architecture\n\n```mermaid\nflowchart LR/);
  });

  it('relative-gif: demo media passes', () => {
    const { snap, parsed } = parsedFrom('relative-gif.md');
    expect(byId(audit(parsed, snap.meta))['demo-media']!.passed).toBe(true);
  });

  it('architecture section without mermaid mentions the section heading', () => {
    const { snap, parsed } = parsedFrom('architecture-section-no-mermaid.md');
    const a = byId(audit(parsed, snap.meta)).architecture!;
    expect(a.passed).toBe(false);
    expect(a.detail).toContain(parsed.architecture.section!.heading);
  });
});

describe('exportHeroMarkdown (FR-8.2)', () => {
  const url = 'https://readmehook.example/r/acme/widget';

  it('title, pitch, badges, quickstart, the README diagram, link back, in that order', () => {
    const { snap, parsed } = parsedFrom('with-mermaid.md', { description: 'Widgets  for\nteams' });
    const md = exportHeroMarkdown(snap.meta, parsed, url);
    const order = ['# widget', '> Widgets for teams', 'img.shields.io/github/stars/acme/widget', '## Quickstart', '```mermaid', url];
    const idx = order.map((s) => md.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(md).toContain(parsed.architecture.diagram.code.trim());
    expect(md.endsWith('\n')).toBe(true);
  });

  it('uses demo media instead of a generated diagram when the README has a GIF but no mermaid', () => {
    const { snap, parsed } = parsedFrom('relative-gif.md');
    const md = exportHeroMarkdown(snap.meta, parsed, url);
    expect(md).toContain(`![widget demo](${parsed.media!.url})`);
    expect(md).not.toContain('```mermaid');
  });

  it('falls back to a generated diagram and a language pitch for an empty README', () => {
    const { snap, parsed } = parsedFrom('empty.md', { language: 'Rust' });
    const md = exportHeroMarkdown(snap.meta, parsed, url);
    expect(md).toContain('> A Rust project.');
    expect(md).toContain('```mermaid\nflowchart LR');
  });

  it('is deterministic', () => {
    const { snap, parsed } = parsedFrom('with-mermaid.md');
    expect(exportHeroMarkdown(snap.meta, parsed, url)).toBe(exportHeroMarkdown(snap.meta, parsed, url));
  });
});

describe('markdown helpers', () => {
  it('fence grows past backtick runs inside the code', () => {
    expect(fence('echo hi', 'bash')).toBe('```bash\necho hi\n```');
    expect(fence('a ```` b')).toBe('`````\na ```` b\n`````');
  });
  it('oneLine collapses whitespace and truncates', () => {
    expect(oneLine('a\n\n b')).toBe('a b');
    expect(oneLine('x'.repeat(200), 10)).toBe(`${'x'.repeat(9)}…`);
  });
  it('escapeInline neutralises markdown syntax', () => {
    expect(escapeInline('[x](y) *z*')).toBe('\\[x\\](y) \\*z\\*');
  });
});

describe('share (FR-9.2)', () => {
  it('builds the ?ref=discord link and a prompt without pings', () => {
    expect(cardUrl('https://rh.dev/', 'acme', 'widget', 'discord')).toBe('https://rh.dev/r/acme/widget?ref=discord');
    const p = discordPrompt('https://rh.dev', 'acme', 'widget');
    expect(p).toContain('https://rh.dev/r/acme/widget?ref=discord');
    expect(p).not.toMatch(/@everyone|@here/);
  });
});
