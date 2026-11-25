/** FR-3.1–3.3 extractors. PURE: no I/O, no Date, no randomness. */
import { scanMarkdown, type ScannedMarkdown } from './markdown';
import type { MediaKind } from './types';

type Scannable = string | ScannedMarkdown;
const scan = (md: Scannable): ScannedMarkdown => (typeof md === 'string' ? scanMarkdown(md) : md);

/* ------------------------------------------------------------------ mermaid */

export type MermaidExtraction =
  | { kind: 'mermaid'; code: string }
  | { kind: 'section'; heading: string; text: string };

const ARCH_HEADING_RE = /^(?:architecture|how\s+it\s+works)\b/i;

/** FR-3.1: first ```mermaid block, else the body of an Architecture / How it works section. */
export function extractMermaid(md: Scannable): MermaidExtraction | null {
  const s = scan(md);

  const block = s.blocks.find((b) => b.lang === 'mermaid' && b.code.trim() !== '');
  if (block) return { kind: 'mermaid', code: block.code.trim() };

  const idx = s.headings.findIndex((h) => ARCH_HEADING_RE.test(h.text.replace(/^[^\p{L}\p{N}]+/u, '')));
  if (idx === -1) return null;
  const heading = s.headings[idx]!;
  const next = s.headings.slice(idx + 1).find((h) => h.level <= heading.level);
  const end = next ? next.index : s.lines.length;
  const text = s.lines.slice(heading.index + 1, end).join('\n').trim();
  if (!text) return null;
  return { kind: 'section', heading: heading.text, text };
}

/* --------------------------------------------------------------- quickstart */

export interface QuickstartExtraction {
  command: string;
  lang: string;
  startLine: number;
  inTop30: boolean;
}

const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'console', 'zsh', '']);
const PROMPT_RE = /^(?:\$|%|>|❯)\s+/;
const COMMAND_RE =
  /^(?:sudo\s+)?(?:npx|npm|pnpm|yarn|docker(?:-compose)?|pip3?|python3?\s+-m\s+pip|uvx?|cargo|go\s+(?:run|install)|git\s+clone)(?:\s|$)/;

/**
 * Normalizes a shell block: if any line carries a prompt (`$ `), keep only prompt lines
 * (drops command output in `console` blocks) and strip the prompt.
 */
function normalizeShell(code: string): string {
  const lines = code.split('\n');
  const hasPrompt = lines.some((l) => PROMPT_RE.test(l.trim()));
  const kept = hasPrompt
    ? lines.filter((l) => PROMPT_RE.test(l.trim())).map((l) => l.trim().replace(PROMPT_RE, ''))
    : lines.map((l) => l.replace(/\s+$/, ''));
  return kept.join('\n').trim();
}

function isQuickstartLine(line: string): boolean {
  const cmd = line.trim().replace(/^(?:&&|;)\s*/, '');
  return cmd
    .split(/\s*(?:&&|;)\s*/)
    .some((part) => COMMAND_RE.test(part.trim()));
}

/** FR-3.2: first shell-ish (or untagged) block that runs a known install/run command. */
export function extractQuickstart(md: Scannable): QuickstartExtraction | null {
  const s = scan(md);
  for (const b of s.blocks) {
    if (!SHELL_LANGS.has(b.lang)) continue;
    const command = normalizeShell(b.code);
    if (!command) continue;
    if (command.split('\n').some(isQuickstartLine)) {
      return { command, lang: b.lang, startLine: b.startLine, inTop30: b.startLine <= 30 };
    }
  }
  return null;
}

/* -------------------------------------------------------------------- media */

export interface RepoContext {
  owner: string;
  repo: string;
  branch: string;
}

export interface MediaExtraction {
  url: string;
  kind: MediaKind;
}

const MEDIA_EXT_RE = /\.(gif|mp4|webm|mov)$/i;
const ATTACHMENT_RE = /^https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/i;
const URL_CANDIDATE_RES = [
  /!?\[[^\]]*\]\(\s*<?([^)\s>]+)/g, // Markdown image / link
  /\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi, // HTML attributes
  /(?<![("'=<])(https?:\/\/[^\s)<>"'\]]+)/g, // bare URLs
];

function classify(url: string): MediaKind | null {
  if (ATTACHMENT_RE.test(url)) return 'attachment';
  const path = url.replace(/[?#].*$/, '');
  const ext = MEDIA_EXT_RE.exec(path)?.[1]?.toLowerCase();
  if (!ext) return null;
  return ext === 'gif' ? 'gif' : 'video';
}

/** Resolves relative and github.com/blob URLs to raw.githubusercontent.com. */
export function resolveMediaUrl(url: string, ctx: RepoContext): string {
  const raw = `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}`;
  if (/^https?:\/\//i.test(url)) {
    const blob = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i.exec(url);
    return blob ? `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}` : url;
  }
  if (url.startsWith('//')) return `https:${url}`;
  const path = url.replace(/^\.\//, '').replace(/^\/+/, '');
  return `${raw}/${ctx.branch}/${path}`;
}

/** FR-3.3: first GIF/video URL (or user-attachments asset) outside code blocks, resolved to absolute. */
export function extractMedia(md: Scannable, ctx: RepoContext): MediaExtraction | null {
  const s = scan(md);
  for (let i = 0; i < s.lines.length; i++) {
    if (s.inFence[i]) continue;
    const line = s.lines[i]!;
    const found: { pos: number; url: string }[] = [];
    for (const re of URL_CANDIDATE_RES) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) found.push({ pos: m.index ?? 0, url: m[1]! });
    }
    found.sort((a, b) => a.pos - b.pos);
    for (const { url } of found) {
      const kind = classify(url);
      if (kind) return { url: resolveMediaUrl(url, ctx), kind };
    }
  }
  return null;
}
