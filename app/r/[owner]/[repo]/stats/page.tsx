import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { CopyButton } from '@/components/ui/CopyButton';
import { Notice } from '@/components/ui/Notice';
import { audit, type AuditCheck } from '@/lib/advice/audit';
import { exportHeroMarkdown } from '@/lib/advice/export';
import { cardPath, cardUrl } from '@/lib/advice/share';
import { loadRepoForPage } from '@/lib/github/load';
import { parseReadme } from '@/lib/parser';
import { siteUrl } from '@/lib/site';

type Props = PageProps<'/r/[owner]/[repo]/stats'>;

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { owner, repo } = await params;
  return {
    title: `README audit · ${decodeURIComponent(owner)}/${decodeURIComponent(repo)} · ReadmeHook`,
    robots: { index: false },
  };
}

/** FR-8.1 / FR-8.2: the creator's page. Not part of the experiment: no evaluation, no telemetry. */
export default function StatsPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 pt-8 pb-12 sm:px-6 sm:pt-12">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading audit</p>}>
        <Stats params={params} />
      </Suspense>
    </main>
  );
}

async function Stats({ params }: Pick<Props, 'params'>) {
  await connection();
  const { owner: rawOwner, repo: rawRepo } = await params;
  const load = await loadRepoForPage(decodeURIComponent(rawOwner), decodeURIComponent(rawRepo));
  if (!load.ok) return <Notice title={load.title} body={load.body} />;

  const { meta } = load.snapshot;
  const parsed = parseReadme(load.snapshot);
  const checks = audit(parsed, meta);
  const markdown = exportHeroMarkdown(meta, parsed, cardUrl(siteUrl(), meta.owner, meta.repo));
  const failing = checks.filter((c) => !c.passed).length;

  return (
    <>
      <header>
        <Link
          href={cardPath(meta.owner, meta.repo)}
          className="rounded-sm text-sm text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          {meta.fullName}
        </Link>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-zinc-50">README audit</h1>
        <p className="mt-2 text-base text-zinc-400">
          {failing === 0
            ? 'All three first-screen checks pass'
            : `${failing} of 3 first-screen checks need work. Each one comes with Markdown you can paste`}
        </p>
      </header>

      <ol className="mt-8 space-y-4" aria-label="Audit checks">
        {checks.map((check) => (
          <AuditCard key={check.id} check={check} />
        ))}
      </ol>

      <section aria-labelledby="export-title" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="export-title" className="text-lg font-medium text-zinc-100">
              Optimized README hero
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Title, pitch, badges, quickstart and a visual, ready for the top of your README</p>
          </div>
          <CopyButton text={markdown} label="Copy optimized README hero" />
        </div>
        <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <CodeBlock code={markdown} lang="markdown" />
        </div>
      </section>
    </>
  );
}

function AuditCard({ check }: { check: AuditCheck }) {
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-2 h-2 w-2 shrink-0 rounded-full ${check.passed ? 'bg-emerald-400' : 'bg-amber-400'}`}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-zinc-100">
            <span className="sr-only">{check.passed ? 'Passed: ' : 'Needs work: '}</span>
            {check.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">{check.detail}</p>
        </div>
        {check.snippet ? <CopyButton text={check.snippet} label="Copy snippet" /> : null}
      </div>
      {check.snippet ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          <CodeBlock code={check.snippet} lang="markdown" />
        </div>
      ) : null}
    </li>
  );
}
