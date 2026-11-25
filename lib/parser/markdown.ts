/** Minimal, linear-time Markdown scanning helpers. PURE: no I/O, no Date, no randomness. */

export interface FencedBlock {
  /** Lowercased first word of the info string, '' when untagged. */
  lang: string;
  code: string;
  /** 1-based line number of the opening fence. */
  startLine: number;
  /** 1-based line number of the closing fence (or last line if unclosed). */
  endLine: number;
}

export interface Heading {
  level: number;
  text: string;
  /** 0-based index into the line array. */
  index: number;
}

export interface ScannedMarkdown {
  lines: string[];
  blocks: FencedBlock[];
  headings: Heading[];
  /** inFence[i] is true when line i is a fence line or inside a fenced block. */
  inFence: boolean[];
}

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})\s*([^`]*)$/;
const ATX_HEADING_RE = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const HTML_HEADING_RE = /^\s*<h([1-6])[^>]*>(.*?)<\/h\1>\s*$/i;

export function splitLines(md: string): string[] {
  return md.replace(/\r\n?/g, '\n').split('\n');
}

export function scanMarkdown(md: string): ScannedMarkdown {
  const lines = splitLines(md);
  const blocks: FencedBlock[] = [];
  const headings: Heading[] = [];
  const inFence = new Array<boolean>(lines.length).fill(false);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const open = FENCE_OPEN_RE.exec(line);
    if (open) {
      const fence = open[1]!;
      const fenceChar = fence[0]!;
      const closeRe = new RegExp(`^ {0,3}${fenceChar === '`' ? '`' : '~'}{${fence.length},}\\s*$`);
      const lang = (open[2] ?? '').trim().split(/[\s{,]/)[0]?.toLowerCase() ?? '';
      const start = i;
      inFence[i] = true;
      i++;
      const body: string[] = [];
      while (i < lines.length && !closeRe.test(lines[i]!)) {
        body.push(lines[i]!);
        inFence[i] = true;
        i++;
      }
      const end = Math.min(i, lines.length - 1);
      if (i < lines.length) inFence[i] = true;
      blocks.push({ lang, code: body.join('\n'), startLine: start + 1, endLine: end + 1 });
      i++;
      continue;
    }

    const atx = ATX_HEADING_RE.exec(line);
    if (atx) {
      headings.push({ level: atx[1]!.length, text: stripInline(atx[2]!), index: i });
    } else {
      const html = HTML_HEADING_RE.exec(line);
      if (html) headings.push({ level: Number(html[1]), text: stripInline(html[2]!), index: i });
    }
    i++;
  }

  return { lines, blocks, headings, inFence };
}

/** Strips simple inline Markdown/HTML so headings compare as plain text. */
export function stripInline(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
