import { describe, expect, it } from 'vitest';
import { extractMedia, extractMermaid, extractQuickstart, resolveMediaUrl } from '@/lib/parser';
import { fixture } from '../helpers';

const ctx = { owner: 'acme', repo: 'widget', branch: 'main' };

describe('extractMermaid (FR-3.1)', () => {
  it('returns the first mermaid block', () => {
    const r = extractMermaid(fixture('with-mermaid.md'));
    expect(r).toEqual({
      kind: 'mermaid',
      code: expect.stringMatching(/^flowchart LR\n {2}Producer -->/),
    });
  });

  it('falls back to a "How it works" section body (heading with emoji)', () => {
    const r = extractMermaid(fixture('architecture-section-no-mermaid.md'));
    expect(r?.kind).toBe('section');
    if (r?.kind !== 'section') return;
    expect(r.heading).toBe('How it works 🔧');
    expect(r.text).toMatch(/^1\. Clients send transactions over gRPC\./);
    expect(r.text).toContain('client -> grpc -> validator');
    expect(r.text).not.toContain('Getting started');
  });

  it('includes deeper subsections and stops at the next same-level heading', () => {
    const r = extractMermaid(fixture('rust-repo.md'));
    expect(r?.kind).toBe('section');
    if (r?.kind !== 'section') return;
    expect(r.text).toContain('### Backpressure');
    expect(r.text).not.toContain('Apache-2.0');
  });

  it('matches an "## Architecture" heading case-insensitively', () => {
    expect(extractMermaid('# x\n\n## ARCHITECTURE\n\nThree services.\n\n## Next')).toEqual({
      kind: 'section',
      heading: 'ARCHITECTURE',
      text: 'Three services.',
    });
  });

  it('ignores headings inside code fences', () => {
    expect(extractMermaid('```md\n## Architecture\nfake\n```\n')).toBeNull();
  });

  it('returns null when absent', () => {
    expect(extractMermaid(fixture('python-repo.md'))).toBeNull();
    expect(extractMermaid(fixture('empty.md'))).toBeNull();
  });

  it('ignores an empty mermaid block', () => {
    expect(extractMermaid('```mermaid\n\n```')).toBeNull();
  });
});

describe('extractQuickstart (FR-3.2)', () => {
  it('finds a tagged bash block in the top 30 lines', () => {
    expect(extractQuickstart(fixture('with-mermaid.md'))).toEqual({
      command: 'npx create-relay-app my-app\ncd my-app\nnpm run dev',
      lang: 'bash',
      startLine: 23,
      inTop30: true,
    });
  });

  it('accepts an untagged block and strips prompts + command output', () => {
    const r = extractQuickstart(fixture('untagged-quickstart.md'));
    expect(r).toMatchObject({ lang: '', command: 'npm install -g fastgrep\nfastgrep "TODO" ./src', inTop30: true });
  });

  it('handles console blocks with python -m pip below line 30', () => {
    const r = extractQuickstart(fixture('python-repo.md'));
    expect(r).toMatchObject({ lang: 'console', command: 'python -m pip install tabloid', inTop30: false });
    expect(r!.startLine).toBeGreaterThan(30);
  });

  it('accepts sh blocks with git clone and shell blocks with cargo', () => {
    expect(extractQuickstart(fixture('relative-gif.md'))?.command).toMatch(/^git clone https:\/\/github.com\/pixelpals/);
    expect(extractQuickstart(fixture('rust-repo.md'))).toMatchObject({
      lang: 'shell',
      command: 'cargo install ferrite --locked',
    });
  });

  it('matches `go install` but skips shell blocks without a known command', () => {
    expect(extractQuickstart(fixture('architecture-section-no-mermaid.md'))?.command).toMatch(/^go install /);
    const r = extractQuickstart(fixture('quickstart-below-fold.md'));
    expect(r).toMatchObject({ command: 'pnpm add -D deepdocs', inTop30: false });
  });

  it('skips non-shell languages even if they mention npm', () => {
    expect(extractQuickstart('```js\n// npm install foo\n```\n```python\npip install x\n```')).toBeNull();
  });

  it('finds commands chained after cd', () => {
    expect(extractQuickstart('```bash\ncd app && pnpm install\n```')?.command).toBe('cd app && pnpm install');
  });

  it('accepts a zsh block and ~~~ fences', () => {
    expect(extractQuickstart('~~~zsh\nyarn add widget\n~~~')?.lang).toBe('zsh');
  });

  it('does not treat words like "pipeline" or "gopher" as commands', () => {
    expect(extractQuickstart('```\npipeline run\ngopher go\n```')).toBeNull();
  });

  it('returns null for an empty README', () => {
    expect(extractQuickstart(fixture('empty.md'))).toBeNull();
  });
});

describe('extractMedia (FR-3.3)', () => {
  it('resolves a relative GIF to raw.githubusercontent.com on the default branch', () => {
    expect(extractMedia(fixture('relative-gif.md'), { owner: 'pixelpals', repo: 'pixel-pals', branch: 'trunk' })).toEqual({
      url: 'https://raw.githubusercontent.com/pixelpals/pixel-pals/trunk/assets/demo.gif',
      kind: 'gif',
    });
  });

  it('finds a <video src> and rewrites github.com/.../raw/ URLs to raw.githubusercontent.com', () => {
    expect(extractMedia(fixture('rust-repo.md'), ctx)).toEqual({
      url: 'https://raw.githubusercontent.com/ferrite-rs/ferrite/main/media/tail.mp4',
      kind: 'video',
    });
  });

  it('detects bare user-attachments asset URLs', () => {
    expect(extractMedia(fixture('python-repo.md'), ctx)).toEqual({
      url: 'https://github.com/user-attachments/assets/4f0c2a6e-9b1d-4c3e-8a77-2d5e1f0b9c11',
      kind: 'attachment',
    });
  });

  it('ignores badges, PNGs, non-media links, and URLs inside code blocks', () => {
    expect(extractMedia(fixture('quickstart-below-fold.md'), ctx)).toBeNull();
    expect(extractMedia(fixture('with-mermaid.md'), ctx)).toBeNull();
    expect(extractMedia('```\n![x](demo.gif)\n```', ctx)).toBeNull();
  });

  it('handles query strings and uppercase extensions', () => {
    expect(extractMedia('<img src="https://cdn.example.com/Demo.GIF?v=2">', ctx)?.kind).toBe('gif');
    expect(extractMedia('[watch](media/intro.webm)', ctx)?.url).toBe(
      'https://raw.githubusercontent.com/acme/widget/main/media/intro.webm',
    );
  });

  it('returns the first media URL by position on a line', () => {
    expect(extractMedia('![a](a.mp4) ![b](b.gif)', ctx)?.kind).toBe('video');
  });

  it('returns null for an empty README', () => {
    expect(extractMedia(fixture('empty.md'), ctx)).toBeNull();
  });
});

describe('resolveMediaUrl', () => {
  it.each([
    ['./demo.gif', 'https://raw.githubusercontent.com/acme/widget/main/demo.gif'],
    ['/docs/demo.gif', 'https://raw.githubusercontent.com/acme/widget/main/docs/demo.gif'],
    ['docs/demo.gif', 'https://raw.githubusercontent.com/acme/widget/main/docs/demo.gif'],
    ['//cdn.example.com/a.gif', 'https://cdn.example.com/a.gif'],
    ['https://github.com/o/r/blob/dev/a.gif', 'https://raw.githubusercontent.com/o/r/dev/a.gif'],
    ['https://cdn.example.com/a.gif', 'https://cdn.example.com/a.gif'],
  ])('%s → %s', (input, expected) => {
    expect(resolveMediaUrl(input, ctx)).toBe(expected);
  });
});
