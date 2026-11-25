import 'server-only';
import { getSingletonHighlighter } from 'shiki';

/** FR-4.4: server-side syntax highlighting with shiki. Never throws; falls back to escaped plain text. */

export type HighlightLang = 'bash' | 'mermaid' | 'text';
const THEME = 'github-dark-default';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function highlight(code: string, lang: HighlightLang): Promise<string> {
  try {
    const highlighter = await getSingletonHighlighter({ themes: [THEME], langs: ['bash', 'mermaid'] });
    return highlighter.codeToHtml(code, { lang, theme: THEME });
  } catch (err) {
    console.warn('[highlight] shiki failed, using plain text', err);
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}
