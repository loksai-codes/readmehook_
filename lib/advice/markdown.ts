/** Markdown helpers for the advice engine. PURE. */

/** A fenced block whose fence is longer than any backtick run inside the code, so it can't break out. */
export function fence(code: string, lang = ''): string {
  const longest = Math.max(0, ...Array.from(code.matchAll(/`+/g), (m) => m[0].length));
  const ticks = '`'.repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${code.replace(/\s+$/, '')}\n${ticks}`;
}

/** One line, no Markdown-breaking newlines, trimmed to `max` characters. */
export function oneLine(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Escapes characters that would turn plain text into Markdown syntax at the start of a line or inline. */
export function escapeInline(text: string): string {
  return text.replace(/([\\`*_[\]<>|])/g, '\\$1');
}
