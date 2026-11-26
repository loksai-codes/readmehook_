import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { Suspense } from 'react';
import {
  ArmTable,
  AssignmentSummary,
  bounceBars,
  intentBars,
  RateBars,
  SourceTable,
} from '@/components/insights/ExperimentViews';
import { SegmentDrawer } from '@/components/insights/SegmentDrawer';
import { VerdictPanel } from '@/components/insights/VerdictPanel';
import { armStats, formatRate, verdict } from '@/lib/advice/verdict';
import { flagsmithExperimentUrl, flagsmithSegmentsUrl } from '@/lib/flagsmith/links';
import { ADMIN_COOKIE, isAdminCookie } from '@/lib/identity/admin';
import { readInsightsCounters } from '@/lib/telemetry/counters';

export const metadata: Metadata = {
  title: 'Experiment insights · ReadmeHook',
  description: 'Live counters for the repo_hero_layout A/B test: quickstart first vs architecture first.',
};

/** FR-10: public dashboard of the live Redis counters. Flagsmith stays the source of truth (FR-10.4). */
export default function InsightsPage() {
  const resultsUrl = flagsmithExperimentUrl();
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-12 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-zinc-400">ReadmeHook experiment</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-zinc-50">Hero layout: quickstart vs architecture</h1>
          <p className="mt-2 max-w-2xl text-base text-zinc-400">
            Does a copyable quickstart above the fold make more visitors copy the clone command or click through to
            GitHub than an architecture diagram does?
          </p>
        </div>
        <a
          href={resultsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
        >
          Results in Flagsmith
        </a>
      </header>
      <p className="mt-4 text-sm text-zinc-500">
        Flagsmith&apos;s results page is the source of truth. The numbers below are live counters from this site,
        unique visitors per metric, updated on every event
      </p>

      <Suspense fallback={<p className="mt-10 text-sm text-zinc-500">Loading counters</p>}>
        <Dashboard resultsUrl={resultsUrl} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ resultsUrl }: { resultsUrl: string }) {
  await connection();
  const [counters, jar] = await Promise.all([readInsightsCounters(), cookies()]);
  const admin = await isAdminCookie(jar.get(ADMIN_COOKIE)?.value);

  if (!counters.available) {
    return (
      <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-400">
        Live counters are unavailable right now. The Flagsmith results page still has the experiment data
      </p>
    );
  }

  const arms = armStats(counters.global);
  const v = verdict(arms);

  return (
    <>
      {counters.prefix ? (
        <p className="mt-4 font-mono text-xs text-amber-200/80" data-telemetry-prefix={counters.prefix}>
          Reading counters under prefix {counters.prefix}
        </p>
      ) : null}

      <section aria-labelledby="overview" className="mt-10">
        <h2 id="overview" className="sr-only">
          Overview
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {arms.map((a) => (
            <div key={a.variant} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <dt className="truncate font-mono text-xs text-zinc-400">{a.variant}</dt>
              <dd className="mt-2 text-3xl font-medium text-zinc-50 tabular-nums">{a.n}</dd>
              <dd className="mt-1 text-xs text-zinc-500">visitors</dd>
            </div>
          ))}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <dt className="text-xs text-zinc-400">All arms</dt>
            <dd className="mt-2 text-3xl font-medium text-zinc-50 tabular-nums">{v.totalViews}</dd>
            <dd className="mt-1 text-xs text-zinc-500">visitors</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="assignment" className="mt-8 rounded-xl border border-zinc-800 p-5">
        <h2 id="assignment" className="text-sm text-zinc-400">
          Where the variant came from
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Recorded on the server for each visitor since this was added; earlier visits have no record
        </p>
        <div className="mt-3">
          <AssignmentSummary rows={arms.map((a) => ({ variant: a.variant, counts: counters.assignments[a.variant] }))} />
        </div>
      </section>

      <section aria-labelledby="verdict" className="mt-8 rounded-xl border border-zinc-800 p-5">
        <h2 id="verdict" className="text-sm text-zinc-400">
          Where it stands
        </h2>
        <div className="mt-3">
          <VerdictPanel verdict={v} resultsUrl={resultsUrl} />
        </div>
      </section>

      <section aria-labelledby="arms" className="mt-8 space-y-4">
        <h2 id="arms" className="text-lg font-medium text-zinc-100">
          By variant
        </h2>
        <ArmTable arms={arms} caption="Visitors, developer intent and bounce rate per variant" />
        <div className="grid gap-4 md:grid-cols-2">
          <RateBars title="Developer intent rate" rows={intentBars(arms, v.leader)} />
          <RateBars title="Bounce under 5 s (guardrail)" rows={bounceBars(arms)} />
        </div>
      </section>

      <section aria-labelledby="sources" className="mt-12">
        <h2 id="sources" className="text-lg font-medium text-zinc-100">
          Confound check: which button converted
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          quickstart_first has an extra copy button that the control doesn&apos;t, and copying its command (for example{' '}
          <code className="font-mono text-zinc-300">pnpm install</code>) counts as a clone copy in Flagsmith. The clone
          box and GitHub button are identical in both arms, so their rates are the layout-only comparison. Unique
          visitors, counted since source tracking started, so n here is smaller than above
        </p>
        <div className="mt-4">
          <SourceTable rows={arms.map((a) => ({ variant: a.variant, counts: counters.sources[a.variant] }))} />
        </div>
      </section>

      <section aria-labelledby="languages" className="mt-12">
        <h2 id="languages" className="text-lg font-medium text-zinc-100">
          By repo language
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Intent rate per variant, with visitors (n) in brackets</p>
        {counters.languages.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No language data yet</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Developer intent rate per variant by repository language</caption>
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-normal">Language</th>
                  {arms.map((a) => (
                    <th key={a.variant} scope="col" className="px-4 py-3 text-right font-mono font-normal">
                      {a.variant}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono text-zinc-200 tabular-nums">
                {counters.languages.map((row) => {
                  const langArms = armStats(row.arms, arms.map((a) => a.variant));
                  return (
                    <tr key={row.language}>
                      <th scope="row" className="px-4 py-3 font-sans font-normal text-zinc-100">
                        {row.language}
                      </th>
                      {langArms.map((a) => (
                        <td key={a.variant} className="px-4 py-3 text-right">
                          {formatRate(a.intentRate)} <span className="text-zinc-500">({a.n})</span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {admin ? (
        <section aria-label="Admin" className="mt-12">
          <SegmentDrawer segmentsUrl={flagsmithSegmentsUrl()} />
        </section>
      ) : null}
    </>
  );
}
