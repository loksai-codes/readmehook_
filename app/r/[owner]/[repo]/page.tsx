import Link from 'next/link';
import { Suspense } from 'react';
import { RateLimitedError, RepoNotFoundError } from '@/lib/github/errors';
import { isValidSlug } from '@/lib/github/slug';
import { getRepoSnapshot } from '@/lib/github/snapshot';
import { parseReadme } from '@/lib/parser';

/**
 * TEMPORARY (Milestone 1): dumps the snapshot + parsed README as JSON.
 * Milestone 2 replaces this with HeroShell + the variant hero.
 */
export default function RepoCardPage({ params }: PageProps<'/r/[owner]/[repo]'>) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Suspense fallback={<p className="text-zinc-400">Loading repo…</p>}>
        <SnapshotDump params={params} />
      </Suspense>
    </main>
  );
}

async function SnapshotDump({ params }: { params: PageProps<'/r/[owner]/[repo]'>['params'] }) {
  const { owner: rawOwner, repo: rawRepo } = await params;
  const owner = decodeURIComponent(rawOwner);
  const repo = decodeURIComponent(rawRepo);

  if (!isValidSlug(owner, repo)) {
    return <Notice title="That doesn't look like a GitHub repo" body={`"${owner}/${repo}" isn't a valid owner/repo.`} />;
  }

  let result;
  try {
    result = await getRepoSnapshot(owner, repo);
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

  const { snapshot, cache } = result;
  const parsed = parseReadme(snapshot);
  const dump = {
    cache,
    snapshot: {
      ...snapshot,
      readme: snapshot.readme.length > 600 ? `${snapshot.readme.slice(0, 600)}…` : snapshot.readme,
      readmeLength: snapshot.readme.length,
    },
    parsed,
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-zinc-50">{snapshot.meta.fullName}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Temporary debug view · cache: <span className="font-mono text-emerald-400">{cache}</span>
      </p>
      <pre className="mt-6 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
        {JSON.stringify(dump, null, 2)}
      </pre>
    </>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <h1 className="text-xl font-semibold text-zinc-50">{title}</h1>
      <p className="mt-2 text-zinc-400">{body}</p>
      <Link href="/" className="mt-4 inline-block text-sm text-emerald-400 underline-offset-4 hover:underline">
        Try another repo
      </Link>
    </div>
  );
}
