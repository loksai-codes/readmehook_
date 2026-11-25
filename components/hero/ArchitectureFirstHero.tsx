import { CodeBlock } from '@/components/ui/CodeBlock';
import type { ParsedReadme } from '@/lib/parser/types';
import { HeroFrame } from './HeroFrame';
import { MermaidDiagram } from './MermaidDiagram';

/** Control arm: architecture diagram above the fold (README mermaid, else synthesized flowchart). */
export function ArchitectureFirstHero({ parsed }: { parsed: ParsedReadme }) {
  const { diagram, section } = parsed.architecture;
  // Shown whenever the diagram can't render (or renders empty): the Mermaid source, never a blank box.
  const fallback = (
    <div className="max-h-[28rem] overflow-auto rounded-xl border border-white/[0.06] bg-zinc-900/60">
      <CodeBlock code={diagram.code} lang="mermaid" className="rh-code-wrap" />
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
        <div className="grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="p-5 sm:p-6">
            <MermaidDiagram code={diagram.code} fallback={fallback} />
          </div>
          <div className="border-t border-white/[0.06] p-5 sm:p-6 md:border-t-0 md:border-l">
            <p className="line-clamp-[10] text-sm leading-relaxed whitespace-pre-line text-zinc-400">{section.text}</p>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <MermaidDiagram code={diagram.code} fallback={fallback} />
        </div>
      )}
    </HeroFrame>
  );
}
