import Link from 'next/link';
import { Suspense } from 'react';
import { DevVariantToolbar } from '@/components/hero/DevVariantToolbar';
import { HeroShell } from '@/components/hero/HeroShell';
import { VariantHero } from '@/components/hero/VariantHero';
import { buildHeroTraits, devVariantOverride, resolveVariantForMilestone2 } from '@/lib/flagsmith/traits';
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

  // Milestone 2: control for everyone (bots included, FR-5.3) unless ?variant= is forced in dev.
  // Milestone 3 swaps this for Flagsmith evaluation of human page views.
  const variant = resolveVariantForMilestone2(query.variant);
  const path = `/r/${snapshot.meta.owner}/${snapshot.meta.repo}`;

  return (
    <>
      <HeroShell meta={snapshot.meta} cloneCommand={parsed.cloneCommand} variant={variant}>
        <VariantHero variant={variant} snapshot={snapshot} parsed={parsed} />
      </HeroShell>
      {process.env.NODE_ENV !== 'production' ? (
        <DevVariantToolbar
          path={path}
          variant={variant}
          overridden={devVariantOverride(query.variant) !== null}
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
        <h1 className="text-xl font-semibold text-zinc-50">{title}</h1>
        <p className="mt-2 text-zinc-400">{body}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-emerald-400 underline-offset-4 hover:underline">
          Try another repo
        </Link>
      </div>
    </div>
  );
}
