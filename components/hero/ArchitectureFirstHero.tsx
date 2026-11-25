import { CodeBlock } from '@/components/ui/CodeBlock';
import type { ParsedReadme } from '@/lib/parser/types';
import { HeroFrame } from './HeroFrame';
import { MermaidDiagram } from './MermaidDiagram';

/** Control arm: architecture diagram above the fold (README mermaid, else synthesized flowchart). */
export function ArchitectureFirstHero({ parsed }: { parsed: ParsedReadme }) {
  const { diagram, section } = parsed.architecture;
  const fallback = (
    <div className="h-full overflow-auto">
      <CodeBlock code={diagram.code} lang="mermaid" />
    </div>
  );

  return (
    <HeroFrame
      eyebrow="Architecture"
      title={section?.heading ?? 'How it works'}
      caption={
        diagram.source === 'extracted'
          ? 'Diagram from the README'
          : section
            ? 'Overview generated from repo metadata · notes from the README'
            : 'Overview generated from repo metadata'
      }
    >
      {section && diagram.source === 'synthesized' ? (
        <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-rows-1">
          <div className="min-h-0 p-5">
            <MermaidDiagram code={diagram.code} fallback={fallback} />
          </div>
          <div className="max-h-32 overflow-hidden border-t border-zinc-800/80 p-5 md:max-h-none md:border-t-0 md:border-l">
            <p className="line-clamp-[12] text-sm leading-relaxed whitespace-pre-line text-zinc-400">{section.text}</p>
          </div>
        </div>
      ) : (
        <div className="h-full p-5">
          <MermaidDiagram code={diagram.code} fallback={fallback} />
        </div>
      )}
    </HeroFrame>
  );
}
