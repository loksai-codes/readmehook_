import { highlight, type HighlightLang } from '@/lib/highlight';

/** Server component: shiki-highlighted code. Shiki escapes the source, so the HTML is safe to inject. */
export async function CodeBlock({
  code,
  lang,
  className = '',
}: {
  code: string;
  lang: HighlightLang;
  className?: string;
}) {
  const html = await highlight(code, lang);
  return <div className={`rh-code ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
