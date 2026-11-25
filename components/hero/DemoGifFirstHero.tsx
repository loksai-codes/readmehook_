import type { RepoMeta } from '@/lib/github/types';
import { isOverCap, MEDIA_SIZE_CAP_BYTES, probeMediaBytes } from '@/lib/media/probe';
import type { ParsedReadme } from '@/lib/parser/types';
import { DemoMedia } from './DemoMedia';
import { BrowserFrame, TerminalMockup } from './fallbacks';
import { HeroFrame } from './HeroFrame';

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

/** Demo arm: the README's GIF/video, else a homepage browser frame, else a terminal replay. */
export async function DemoGifFirstHero({ parsed, meta }: { parsed: ParsedReadme; meta: RepoMeta }) {
  const { media } = parsed;
  const bytes = media ? await probeMediaBytes(media.url) : null;
  const tooBig = isOverCap(bytes);

  const fallback = (
    <div className="flex items-center justify-center p-5 sm:p-6">
      {meta.homepage ? (
        <BrowserFrame homepage={meta.homepage} name={meta.repo} description={meta.description} />
      ) : (
        <TerminalMockup command={parsed.quickstart.command} repo={meta.repo} />
      )}
    </div>
  );

  let caption: string;
  if (media && !tooBig) caption = 'Demo from the README';
  else if (media && tooBig && bytes)
    caption = `README demo is ${formatMb(bytes)} (over the ${formatMb(MEDIA_SIZE_CAP_BYTES)} cap), so it isn't inlined`;
  else caption = meta.homepage ? 'No demo media in the README · live site preview' : 'No demo media in the README · quickstart replay';

  return (
    <HeroFrame eyebrow="Demo" title={`See ${meta.repo} in action`} caption={caption}>
      {media && !tooBig ? (
        <div className="flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <DemoMedia url={media.url} kind={media.kind} alt={`${meta.repo} demo`} fallback={fallback} />
        </div>
      ) : (
        fallback
      )}
    </HeroFrame>
  );
}
