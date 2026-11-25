import { describe, expect, it } from 'vitest';
import { sanitizeMermaidLabel, synthesizeMermaid, synthesizeQuickstart } from '@/lib/parser';
import { makeSnapshot } from '../helpers';

describe('synthesizeQuickstart (FR-3.4)', () => {
  const clone = 'git clone https://github.com/acme/widget.git && cd widget';

  it.each([
    [['package.json'], null, 'npm install && npm run dev'],
    [['requirements.txt'], 'Python', 'pip install -r requirements.txt'],
    [['pyproject.toml'], 'Python', 'pip install .'],
    [['go.mod'], 'Go', 'go run .'],
    [['Cargo.toml'], 'Rust', 'cargo run'],
    [['docker-compose.yml'], null, 'docker compose up'],
    [['Dockerfile'], null, 'docker build -t widget . && docker run --rm -it widget'],
  ] as const)('%j (%s) → %s', (manifests, language, install) => {
    expect(synthesizeQuickstart(makeSnapshot({ manifests: [...manifests], language }))).toBe(`${clone}\n${install}`);
  });

  it('prefers the manifest matching the repo language', () => {
    const snap = makeSnapshot({ manifests: ['package.json', 'Cargo.toml'], language: 'Rust' });
    expect(synthesizeQuickstart(snap)).toBe(`${clone}\ncargo run`);
  });

  it('prefers requirements.txt over pyproject.toml for Python', () => {
    const snap = makeSnapshot({ manifests: ['pyproject.toml', 'requirements.txt'], language: 'Python' });
    expect(synthesizeQuickstart(snap)).toBe(`${clone}\npip install -r requirements.txt`);
  });

  it('falls back to manifest order when language has no match', () => {
    const snap = makeSnapshot({ manifests: ['Dockerfile', 'go.mod'], language: 'Shell' });
    expect(synthesizeQuickstart(snap)).toBe(`${clone}\ngo run .`);
  });

  it('emits only the clone line without manifests', () => {
    expect(synthesizeQuickstart(makeSnapshot())).toBe(clone);
  });
});

describe('synthesizeMermaid (FR-3.5)', () => {
  it('builds a 3-node flowchart LR with repo and language', () => {
    expect(synthesizeMermaid(makeSnapshot({ repo: 'next.js', language: 'TypeScript' }))).toBe(
      ['flowchart LR', '  A["Input/Client"] --> B["next.js [TypeScript]"]', '  B --> C["Output/API"]'].join('\n'),
    );
  });

  it('omits the language when unknown', () => {
    expect(synthesizeMermaid(makeSnapshot())).toContain('B["widget"]');
  });

  it('adapts labels from topics and manifests', () => {
    expect(synthesizeMermaid(makeSnapshot({ topics: ['cli'], manifests: ['Dockerfile'] }))).toMatch(
      /A\["Terminal\/CLI"\][\s\S]*C\["Container\/API"\]/,
    );
    expect(synthesizeMermaid(makeSnapshot({ topics: ['react', 'graphql'] }))).toMatch(
      /A\["Browser\/Client"\][\s\S]*C\["HTTP API"\]/,
    );
  });

  it('sanitizes characters that would break Mermaid', () => {
    const out = synthesizeMermaid(makeSnapshot({ repo: 'evil"]-->X[', language: 'C#' }));
    expect(out).toContain('B["evil -- X [C]"]');
    expect(out.split('\n')).toHaveLength(3);
  });
});

describe('sanitizeMermaidLabel', () => {
  it('collapses whitespace and truncates', () => {
    expect(sanitizeMermaidLabel('  a   b  ')).toBe('a b');
    expect(sanitizeMermaidLabel('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});
