import { describe, expect, it } from 'vitest';
import { parseReadme } from '@/lib/parser';
import { fixture, makeSnapshot } from '../helpers';

describe('parseReadme (FR-3.6)', () => {
  it('with-mermaid: extracted diagram + quickstart, no media', () => {
    const p = parseReadme(makeSnapshot({ readme: fixture('with-mermaid.md'), manifests: ['package.json'] }));
    expect(p).toMatchObject({
      hasMermaid: true,
      hasQuickstart: true,
      quickstartInTop30: true,
      hasDemoMedia: false,
      media: null,
      architecture: { diagram: { source: 'extracted' }, section: null },
      quickstart: { source: 'extracted', lang: 'bash', startLine: 23 },
      cloneCommand: 'git clone https://github.com/acme/widget.git && cd widget',
    });
  });

  it('empty README: everything synthesized, all flags false', () => {
    const p = parseReadme(makeSnapshot({ readme: fixture('empty.md'), manifests: ['package.json'], language: 'TypeScript' }));
    expect(p).toEqual({
      architecture: {
        diagram: {
          source: 'synthesized',
          code: 'flowchart LR\n  A["Input/Client"] --> B["widget [TypeScript]"]\n  B --> C["Output/API"]',
        },
        section: null,
      },
      quickstart: {
        source: 'synthesized',
        command: 'git clone https://github.com/acme/widget.git && cd widget\nnpm install && npm run dev',
        lang: null,
        startLine: null,
      },
      media: null,
      cloneCommand: 'git clone https://github.com/acme/widget.git && cd widget',
      hasMermaid: false,
      hasDemoMedia: false,
      hasQuickstart: false,
      quickstartInTop30: false,
    });
  });

  it('architecture section without mermaid: section text kept, diagram synthesized', () => {
    const p = parseReadme(makeSnapshot({ readme: fixture('architecture-section-no-mermaid.md'), language: 'Go' }));
    expect(p.hasMermaid).toBe(false);
    expect(p.architecture.diagram.source).toBe('synthesized');
    expect(p.architecture.section?.heading).toBe('How it works 🔧');
  });

  it('relative GIF resolves against the snapshot default branch', () => {
    const p = parseReadme(
      makeSnapshot({ owner: 'pixelpals', repo: 'pixel-pals', defaultBranch: 'trunk', readme: fixture('relative-gif.md') }),
    );
    expect(p.media).toEqual({
      url: 'https://raw.githubusercontent.com/pixelpals/pixel-pals/trunk/assets/demo.gif',
      kind: 'gif',
      source: 'extracted',
    });
    expect(p.hasDemoMedia).toBe(true);
  });

  it('python repo: quickstart found but below the fold, attachment media', () => {
    const p = parseReadme(makeSnapshot({ readme: fixture('python-repo.md'), language: 'Python' }));
    expect(p).toMatchObject({ hasQuickstart: true, quickstartInTop30: false, hasDemoMedia: true, hasMermaid: false });
    expect(p.media?.kind).toBe('attachment');
  });

  it('rust repo: everything extracted except the diagram', () => {
    const p = parseReadme(makeSnapshot({ readme: fixture('rust-repo.md'), language: 'Rust', manifests: ['Cargo.toml'] }));
    expect(p).toMatchObject({ hasQuickstart: true, quickstartInTop30: true, hasDemoMedia: true, hasMermaid: false });
    expect(p.quickstart.command).toBe('cargo install ferrite --locked');
    expect(p.architecture.diagram.code).toContain('widget [Rust]');
  });

  it('is deterministic', () => {
    const snap = makeSnapshot({ readme: fixture('python-repo.md') });
    expect(parseReadme(snap)).toEqual(parseReadme(snap));
  });

  it('normalizes CRLF line endings', () => {
    const crlf = fixture('with-mermaid.md').replace(/\n/g, '\r\n');
    const p = parseReadme(makeSnapshot({ readme: crlf }));
    expect(p.quickstart.command).toBe('npx create-relay-app my-app\ncd my-app\nnpm run dev');
    expect(p.hasMermaid).toBe(true);
  });

  it('parses a 200 KB README in < 50 ms (FR-3.7)', () => {
    const chunk = [fixture('python-repo.md'), fixture('rust-repo.md'), fixture('quickstart-below-fold.md')].join('\n');
    let big = '';
    while (big.length < 200 * 1024) big += `${chunk}\n`;
    const snap = makeSnapshot({ readme: big });
    parseReadme(snap); // warm up JIT
    const t0 = performance.now();
    parseReadme(snap);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
