import type { HeroLayout } from '@/lib/flagsmith/variants';
import type { RepoSnapshot } from '@/lib/github/types';
import type { ParsedReadme } from '@/lib/parser/types';
import { ArchitectureFirstHero } from './ArchitectureFirstHero';
import { DemoGifFirstHero } from './DemoGifFirstHero';
import { QuickstartFirstHero } from './QuickstartFirstHero';

/** Picks the hero block for a server-decided variant (CLAUDE.md rule 6). Unknown → control. */
export function VariantHero({
  variant,
  snapshot,
  parsed,
}: {
  variant: HeroLayout;
  snapshot: RepoSnapshot;
  parsed: ParsedReadme;
}) {
  switch (variant) {
    case 'quickstart_first':
      return <QuickstartFirstHero parsed={parsed} meta={snapshot.meta} manifests={snapshot.manifests} />;
    case 'demo_gif_first':
      return <DemoGifFirstHero parsed={parsed} meta={snapshot.meta} />;
    case 'architecture_first':
    default:
      return <ArchitectureFirstHero parsed={parsed} />;
  }
}
