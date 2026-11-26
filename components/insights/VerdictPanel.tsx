import { LOW_SAMPLE_PER_ARM, type Verdict } from '@/lib/advice/verdict';

/**
 * FR-8.3 headline, guardrail warnings and sample note. Below LOW_SAMPLE_PER_ARM the headline itself
 * says it's too early, and no leader is named anywhere.
 */
export function VerdictPanel({ verdict, resultsUrl }: { verdict: Verdict; resultsUrl: string }) {
  return (
    <div className="space-y-3">
      <p className="text-base text-zinc-100">{verdict.headline}</p>
      {verdict.guardrailWarnings.map((w) => (
        <p key={w} role="alert" className="flex gap-2 text-sm text-rose-300">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
          {w}
        </p>
      ))}
      {verdict.lowSample ? (
        <p className="flex gap-2 text-sm text-amber-200/90">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          No leader until every arm has at least {LOW_SAMPLE_PER_ARM} visitors. The raw numbers below can flip with a
          few more visits
        </p>
      ) : null}
      <p className="text-xs text-zinc-500">
        Live counters, not a significance test.{' '}
        <a
          href={resultsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm text-zinc-300 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          Flagsmith results
        </a>{' '}
        are the source of truth
      </p>
    </div>
  );
}
