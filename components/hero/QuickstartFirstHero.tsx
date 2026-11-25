import { CodeBlock } from '@/components/ui/CodeBlock';
import { CopyCommandButton } from '@/components/telemetry/CopyCommandButton';
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
      title="Run it locally"
      actions={
        <CopyCommandButton
          text={quickstart.command}
          label="Copy command"
          repoSlug={meta.fullName}
          variant="quickstart_first"
        />
      }
      caption={
        quickstart.source === 'extracted'
          ? `From the README${quickstart.startLine ? ` (line ${quickstart.startLine})` : ''}`
          : `Generated from ${manifest ?? 'the repo URL'}`
      }
    >
      <div className="p-5 sm:p-6">
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1117]">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="ml-3 font-mono text-[11px] text-zinc-500">~/{meta.repo}</span>
          </div>
          <CodeBlock code={quickstart.command} lang="bash" className="rh-code-lg rh-code-wrap" />
        </div>
      </div>
    </HeroFrame>
  );
}
