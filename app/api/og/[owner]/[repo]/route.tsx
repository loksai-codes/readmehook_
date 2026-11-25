import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { languageColor } from '@/lib/github/languages';
import { isValidSlug } from '@/lib/github/slug';
import { getRepoSnapshot } from '@/lib/github/snapshot';
import type { RepoMeta } from '@/lib/github/types';
import { parseReadme } from '@/lib/parser';

const SIZE = { width: 1200, height: 630 };
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** First few command lines, each clipped so the block never overflows the card. */
function snippetLines(command: string): string[] {
  return command
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .slice(0, 3)
    .map((l) => truncate(l, 44));
}

type CardData = {
  owner: string;
  repo: string;
  description: string | null;
  stars: number | null;
  language: string | null;
  snippet: string[];
};

/**
 * FR-9.1: 1200×630 unfurl image. Fails open: when GitHub or Redis is unavailable it still renders
 * the owner/repo card from the URL, so Discord/Twitter never get a broken image.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/og/[owner]/[repo]'>): Promise<Response> {
  const { owner: rawOwner, repo: rawRepo } = await ctx.params;
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);
  if (!isValidSlug(owner, repo)) return new Response('Not found', { status: 404 });

  let data: CardData = { owner, repo, description: null, stars: null, language: null, snippet: [] };
  let cacheSeconds = 300;
  try {
    const { snapshot } = await getRepoSnapshot(owner, repo);
    const meta: RepoMeta = snapshot.meta;
    data = {
      owner: meta.owner,
      repo: meta.repo,
      description: meta.description,
      stars: meta.stars,
      language: meta.language,
      snippet: snippetLines(parseReadme(snapshot).quickstart.command),
    };
    cacheSeconds = 3600;
  } catch (err) {
    console.warn(`[og] snapshot for ${owner}/${repo} unavailable, rendering minimal card`, err);
  }

  return new ImageResponse(<OgCard {...data} />, {
    ...SIZE,
    headers: { 'cache-control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=86400` },
  });
}

function OgCard({ owner, repo, description, stars, language, snippet }: CardData) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        background: '#0a0a0b',
        color: '#ededed',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 28, color: '#a1a1aa' }}>{owner}</div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 500, letterSpacing: -2, marginTop: 4 }}>
          {truncate(repo, 28)}
        </div>
        {description ? (
          <div style={{ display: 'flex', fontSize: 30, color: '#a1a1aa', marginTop: 16, maxWidth: 1000, lineHeight: 1.35 }}>
            {truncate(description, 110)}
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 24, fontSize: 26, color: '#a1a1aa' }}>
          {stars !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="#71717a">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
              <div style={{ display: 'flex' }}>{compact.format(stars)}</div>
            </div>
          ) : null}
          {language ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: languageColor(language) }} />
              <div style={{ display: 'flex' }}>{language}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
        {snippet.length ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '20px 24px',
              borderRadius: 16,
              border: '1px solid #27272a',
              background: '#111113',
              fontFamily: 'monospace',
              fontSize: 24,
              color: '#e4e4e7',
              gap: 8,
            }}
          >
            {snippet.map((line, i) => (
              <div key={i} style={{ display: 'flex', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <div style={{ display: 'flex', color: '#34d399', width: 28, flexShrink: 0 }}>$</div>
                <div style={{ display: 'flex' }}>{line}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 500 }}>Would you clone this?</div>
          <div style={{ display: 'flex', fontSize: 22, color: '#71717a', marginTop: 8 }}>ReadmeHook</div>
        </div>
      </div>
    </div>
  );
}
