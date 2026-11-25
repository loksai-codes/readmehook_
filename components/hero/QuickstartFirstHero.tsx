import { CodeBlock } from '@/components/ui/CodeBlock';
import { CopyButton } from '@/components/ui/CopyButton';
import type { RepoMeta } from '@/lib/github/types';
import { pickManifest } from '@/lib/parser';
import type { Manifest } from '@/lib/github/types';
import type { ParsedReadme } from '@/lib/parser/types';
import { HeroFrame } from './HeroFrame';

/** Treatment arm: a copyable quickstart command above the fold. */
export function QuickstartFirstHero({
  parsed,
  meta,
  manifests,
}: {
  parsed: ParsedReadme;
  meta: RepoMeta;
  manifests: Manifest[];
}) {
  const { quickstart } = parsed;
  const manifest = quickstart.source === 'synthesized' ? pickManifest({ meta, manifests }) : null;

  return (
    <HeroFrame
      eyebrow="Quickstart"
      title="Run it in 30 seconds"
      actions={<CopyButton text={quickstart.command} label="Copy command" />}
      caption={
        quickstart.source === 'extracted'
          ? `From the README${quickstart.startLine ? ` (line ${quickstart.startLine})` : ''}`
          : `Generated from ${manifest ?? 'the repo URL'}`
      }
    >
      <div className="flex h-full flex-col justify-center overflow-auto px-5 py-6">
        <div className="rounded-lg border border-zinc-800 bg-[#0d1117] shadow-[0_0_0_1px_rgba(52,211,153,0.06),0_20px_60px_-20px_rgba(52,211,153,0.25)]">
          <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-2.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="ml-3 font-mono text-[11px] text-zinc-500">~/{meta.repo}</span>
          </div>
          <CodeBlock code={quickstart.command} lang="bash" className="rh-code-lg" />
        </div>
      </div>
    </HeroFrame>
  );
}
