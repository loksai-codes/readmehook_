import type { Metadata } from 'next';
import { after, connection } from 'next/server';
import { Suspense } from 'react';
import { DevVariantToolbar } from '@/components/hero/DevVariantToolbar';
import { HeroShell } from '@/components/hero/HeroShell';
import { VariantHero } from '@/components/hero/VariantHero';
import { SharePanel } from '@/components/share/SharePanel';
import { BounceGuardrail, CardViewTracker } from '@/components/telemetry/CardTelemetry';
import { Notice } from '@/components/ui/Notice';
import { cardPath } from '@/lib/advice/share';
import { evaluateHeroLayout } from '@/lib/flagsmith/evaluate';
import { flushFlagsmith } from '@/lib/flagsmith/flush';
import { buildHeroTraits, isCreatorView, planVariant } from '@/lib/flagsmith/traits';
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { loadRepoForPage } from '@/lib/github/load';
import { getVisitorContext } from '@/lib/identity/server';
import { parseReadme } from '@/lib/parser';
import { siteUrl } from '@/lib/site';

type Props = PageProps<'/r/[owner]/[repo]'>;

/** FR-9.1: unfurl metadata. Built from the URL only, so it never waits on GitHub. */
export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { owner: rawOwner, repo: rawRepo } = await params;
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);
  const title = `${owner}/${repo} · ReadmeHook`;
  const description = `Would you clone ${repo}? The quickstart, architecture and demo for ${owner}/${repo} on one card.`;
  const image = `${siteUrl()}/api/og/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const url = `${siteUrl()}${cardPath(owner, repo)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'ReadmeHook',
      title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: `${owner}/${repo} on ReadmeHook` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default function RepoCardPage({ params, searchParams }: Props) {
  return (
    <main>
      <Suspense fallback={<CardSkeleton />}>
        <RepoCard params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RepoCard({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  // Request-time only: GitHub/Redis/Flagsmith must never run inside the static prerender
  // (cacheComponents), where their fetches are aborted and would log as failures.
  await connection();
  const [{ owner: rawOwner, repo: rawRepo }, query] = await Promise.all([params, searchParams]);
  const load = await loadRepoForPage(decodeURIComponent(rawOwner), decodeURIComponent(rawRepo));
  if (!load.ok) return <Notice title={load.title} body={load.body} />;
  const { snapshot } = load;

  const parsed = parseReadme(snapshot);
  const visitor = await getVisitorContext(query.ref);
  const traits = buildHeroTraits(snapshot, parsed, visitor.referrerSource);
  const creator = isCreatorView(query.created);

  // FR-6: identify + evaluate (records the exposure) only for real human page views. The exposure
  // is flushed after the response via after() (Vercel waitUntil). Fails open to control.
  const plan = planVariant(query.variant, visitor, { creator });
  let variant: HeroLayout;
  if (plan.source === 'flagsmith') {
    variant = await evaluateHeroLayout(plan.visitorId, traits);
    after(flushFlagsmith);
  } else {
    variant = plan.variant;
  }
  const { owner, repo, fullName: repoSlug } = snapshot.meta;
  // Only experiment views send telemetry; the creator's own view and bots never do.
  const tracked = plan.source === 'flagsmith' || plan.source === 'forced';

  return (
    <>
      {creator ? <SharePanel owner={owner} repo={repo} siteUrl={siteUrl()} /> : null}
      <HeroShell meta={snapshot.meta} cloneCommand={parsed.cloneCommand} variant={variant}>
        <VariantHero variant={variant} snapshot={snapshot} parsed={parsed} />
      </HeroShell>
      {tracked ? (
        <>
          <CardViewTracker repoSlug={repoSlug} variant={variant} />
          <BounceGuardrail repoSlug={repoSlug} variant={variant} />
        </>
      ) : null}
      {process.env.NODE_ENV !== 'production' ? (
        <DevVariantToolbar
          path={cardPath(owner, repo)}
          variant={variant}
          source={plan.source}
          kind={visitor.kind}
          visitorId={visitor.visitorId}
          traits={traits}
        />
      ) : null}
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse px-4 pt-6 sm:px-6 sm:pt-12" aria-busy="true" aria-label="Loading repo">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70">
        <div className="px-5 pt-6 pb-6 sm:px-8 sm:pt-8">
          <div className="h-5 w-32 rounded bg-zinc-800" />
          <div className="mt-4 h-10 w-56 rounded bg-zinc-800" />
          <div className="mt-4 h-6 w-full max-w-xl rounded bg-zinc-800/70" />
          <div className="mt-5 h-4 w-48 rounded bg-zinc-800/70" />
        </div>
        <div className="grid gap-3 border-t border-white/[0.06] p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:p-6">
          <div className="h-20 rounded-xl bg-zinc-950" />
          <div className="h-12 rounded-xl bg-zinc-800 sm:h-20" />
        </div>
      </div>
      <div className="mt-6 h-64 rounded-2xl border border-white/[0.08] bg-zinc-950/80 sm:mt-8" />
    </div>
  );
}
