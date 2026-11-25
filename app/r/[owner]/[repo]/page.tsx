import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { DevVariantToolbar } from '@/components/hero/DevVariantToolbar';
import { HeroShell } from '@/components/hero/HeroShell';
import { VariantHero } from '@/components/hero/VariantHero';
import { BounceGuardrail, CardViewTracker } from '@/components/telemetry/CardTelemetry';
import { evaluateHeroLayout } from '@/lib/flagsmith/evaluate';
import { flushFlagsmith } from '@/lib/flagsmith/flush';
import { buildHeroTraits, planVariant } from '@/lib/flagsmith/traits';
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { RateLimitedError, RepoNotFoundError } from '@/lib/github/errors';
import { isValidSlug } from '@/lib/github/slug';
import { getRepoSnapshot } from '@/lib/github/snapshot';
import { getVisitorContext } from '@/lib/identity/server';
import { parseReadme } from '@/lib/parser';

type Props = PageProps<'/r/[owner]/[repo]'>;

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
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);

  if (!isValidSlug(owner, repo)) {
    return <Notice title="That doesn't look like a GitHub repo" body={`"${owner}/${repo}" isn't a valid owner/repo.`} />;
  }

  let snapshot;
  try {
    ({ snapshot } = await getRepoSnapshot(owner, repo));
  } catch (err) {
    if (err instanceof RepoNotFoundError) {
      return <Notice title="Repo not found or private" body={`We couldn't find a public repo at ${owner}/${repo}.`} />;
    }
    if (err instanceof RateLimitedError) {
      return <Notice title="GitHub is rate-limiting us" body="Try again in a minute." />;
    }
    console.error('[r/page] snapshot failed', err);
    return <Notice title="GitHub didn't answer" body="Something went wrong fetching this repo. Try again shortly." />;
  }

  const parsed = parseReadme(snapshot);
  const visitor = await getVisitorContext(query.ref);
  const traits = buildHeroTraits(snapshot, parsed, visitor.referrerSource);

  // FR-6: identify + evaluate (records the exposure) only for real human page views, then flush
  // before rendering so the exposure is posted before Lambda can freeze. Fails open to control.
  const plan = planVariant(query.variant, visitor);
  let variant: HeroLayout;
  if (plan.source === 'flagsmith') {
    variant = await evaluateHeroLayout(plan.visitorId, traits);
    await flushFlagsmith();
  } else {
    variant = plan.variant;
  }
  const path = `/r/${snapshot.meta.owner}/${snapshot.meta.repo}`;
  const repoSlug = snapshot.meta.fullName;

  return (
    <>
      <HeroShell meta={snapshot.meta} cloneCommand={parsed.cloneCommand} variant={variant}>
        <VariantHero variant={variant} snapshot={snapshot} parsed={parsed} />
      </HeroShell>
      {plan.source !== 'control' ? (
        <>
          <CardViewTracker repoSlug={repoSlug} variant={variant} />
          <BounceGuardrail repoSlug={repoSlug} variant={variant} />
        </>
      ) : null}
      {process.env.NODE_ENV !== 'production' ? (
        <DevVariantToolbar
          path={path}
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
    <div className="mx-auto w-full max-w-4xl animate-pulse px-5 pt-8 sm:px-6 sm:pt-12" aria-busy="true" aria-label="Loading repo">
      <div className="h-4 w-32 rounded bg-zinc-800" />
      <div className="mt-3 h-9 w-64 rounded bg-zinc-800" />
      <div className="mt-3 h-5 w-full max-w-xl rounded bg-zinc-900" />
      <div className="mt-6 h-12 rounded-lg bg-zinc-900" />
      <div className="mt-6 h-[24rem] rounded-xl bg-zinc-900 sm:h-[26rem]" />
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-medium text-zinc-50">{title}</h1>
        <p className="mt-2 text-zinc-400">{body}</p>
        <Link href="/" className="mt-4 inline-block rounded-sm text-sm text-zinc-200 underline underline-offset-4 decoration-zinc-600 transition-colors hover:decoration-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none">
          Try another repo
        </Link>
      </div>
    </div>
  );
}
