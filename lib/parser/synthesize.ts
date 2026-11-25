/** FR-3.4–3.5 fallbacks. PURE: no I/O, no Date, no randomness. */
import type { Manifest, RepoSnapshot } from '@/lib/github/types';

type SnapshotLike = Pick<RepoSnapshot, 'meta' | 'manifests'>;

export function cloneCommand(owner: string, repo: string): string {
  return `git clone https://github.com/${owner}/${repo}.git && cd ${repo}`;
}

const INSTALL_LINE: Record<Manifest, (repo: string) => string> = {
  'package.json': () => 'npm install && npm run dev',
  'requirements.txt': () => 'pip install -r requirements.txt',
  'pyproject.toml': () => 'pip install .',
  'go.mod': () => 'go run .',
  'Cargo.toml': () => 'cargo run',
  'docker-compose.yml': () => 'docker compose up',
  Dockerfile: (repo) => `docker build -t ${repo.toLowerCase()} . && docker run --rm -it ${repo.toLowerCase()}`,
};

/** Manifests that match the repo's primary GitHub language, in preference order. */
const LANGUAGE_MANIFESTS: Record<string, Manifest[]> = {
  javascript: ['package.json'],
  typescript: ['package.json'],
  python: ['requirements.txt', 'pyproject.toml'],
  go: ['go.mod'],
  rust: ['Cargo.toml'],
};

const FALLBACK_ORDER: Manifest[] = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'docker-compose.yml',
  'Dockerfile',
];

export function pickManifest(snapshot: SnapshotLike): Manifest | null {
  const present = new Set(snapshot.manifests);
  const lang = snapshot.meta.language?.toLowerCase() ?? '';
  const preferred = (LANGUAGE_MANIFESTS[lang] ?? []).find((m) => present.has(m));
  return preferred ?? FALLBACK_ORDER.find((m) => present.has(m)) ?? null;
}

/** FR-3.4: clone line + one install line chosen by manifest (language-matched first). */
export function synthesizeQuickstart(snapshot: SnapshotLike): string {
  const { owner, repo } = snapshot.meta;
  const manifest = pickManifest(snapshot);
  const lines = [cloneCommand(owner, repo)];
  if (manifest) lines.push(INSTALL_LINE[manifest](repo));
  return lines.join('\n');
}

/** Strips characters that break Mermaid labels and caps the length. */
export function sanitizeMermaidLabel(text: string, max = 40): string {
  const clean = text
    .replace(/["'`[\]{}()<>|#;&\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function hasAny(topics: Set<string>, words: string[]): boolean {
  return words.some((w) => topics.has(w));
}

/** FR-3.5: 3-node `flowchart LR`, labels nudged by topics + manifests. */
export function synthesizeMermaid(snapshot: SnapshotLike): string {
  const { repo, language } = snapshot.meta;
  const topics = new Set(snapshot.meta.topics.map((t) => t.toLowerCase()));
  const manifests = new Set(snapshot.manifests);

  let input = 'Input/Client';
  if (hasAny(topics, ['cli', 'terminal', 'command-line'])) input = 'Terminal/CLI';
  else if (hasAny(topics, ['react', 'nextjs', 'vue', 'svelte', 'frontend', 'web'])) input = 'Browser/Client';

  let output = 'Output/API';
  if (hasAny(topics, ['database', 'db', 'sql'])) output = 'Database';
  else if (manifests.has('docker-compose.yml') || manifests.has('Dockerfile')) output = 'Container/API';
  else if (hasAny(topics, ['api', 'rest', 'graphql', 'server', 'backend'])) output = 'HTTP API';

  const name = sanitizeMermaidLabel(repo) || 'app';
  const lang = language ? sanitizeMermaidLabel(language, 20) : '';
  const middle = lang ? `${name} [${lang}]` : name;

  return [
    'flowchart LR',
    `  A["${sanitizeMermaidLabel(input)}"] --> B["${middle}"]`,
    `  B --> C["${sanitizeMermaidLabel(output)}"]`,
  ].join('\n');
}
