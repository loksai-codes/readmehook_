import { formatRate, type ArmStats, type GuardrailStatus } from '@/lib/advice/verdict';
import { FALLBACK_REASONS, type FallbackReason, type HeroLayout } from '@/lib/flagsmith/variants';
import type { AssignmentCounts } from '@/lib/telemetry/assignment';
import { CONVERSION_SOURCES, type ConversionSource } from '@/lib/telemetry/events';
import { sourceRate, type SourceCounts } from '@/lib/telemetry/sources';

const CHIP: Record<GuardrailStatus, { label: string; dot: string }> = {
  baseline: { label: 'Baseline', dot: 'bg-zinc-500' },
  ok: { label: 'OK', dot: 'bg-emerald-400' },
  watch: { label: 'Watch', dot: 'bg-amber-400' },
  breach: { label: 'Breach', dot: 'bg-rose-400' },
};

/** FR-10.3 guardrail status: a quiet label with a status dot. */
export function GuardrailChip({ status }: { status: GuardrailStatus }) {
  const chip = CHIP[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${chip.dot}`} />
      {chip.label}
    </span>
  );
}

/** Views, intent and bounce per arm (FR-8.3, FR-10.1). */
export function ArmTable({ arms, caption }: { arms: ArmStats[]; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">Variant</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Visitors (n)</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Intent</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Intent rate</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Bounce rate</th>
            <th scope="col" className="px-4 py-3 font-normal">Guardrail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80 font-mono text-zinc-200 tabular-nums">
          {arms.map((a) => (
            <tr key={a.variant}>
              <th scope="row" className="px-4 py-3 font-normal text-zinc-100">{a.variant}</th>
              <td className="px-4 py-3 text-right">{a.n}</td>
              <td className="px-4 py-3 text-right">{a.intent}</td>
              <td className="px-4 py-3 text-right">{formatRate(a.intentRate)}</td>
              <td className="px-4 py-3 text-right">{formatRate(a.bounceRate)}</td>
              <td className="px-4 py-3 font-sans">
                <GuardrailChip status={a.guardrail} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface BarRow {
  label: string;
  value: number | null;
  /** Drawn in the accent; everything else is neutral. */
  accent?: 'lead' | 'alert';
}

const ROW_H = 36;
const LABEL_W = 152;
const VALUE_W = 64;
const WIDTH = 520;

/** FR-10 simple inline SVG bar chart of rates (0..1). Scales to the largest value so small rates stay readable. */
export function RateBars({ title, rows }: { title: string; rows: BarRow[] }) {
  const max = Math.max(0.05, ...rows.map((r) => r.value ?? 0));
  const barW = WIDTH - LABEL_W - VALUE_W;
  const height = rows.length * ROW_H;
  const summary = rows.map((r) => `${r.label} ${formatRate(r.value)}`).join(', ');

  return (
    <figure className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <figcaption className="text-sm text-zinc-300">{title}</figcaption>
      <svg
        role="img"
        aria-label={`${title}: ${summary}`}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="mt-4 h-auto w-full"
      >
        {rows.map((r, i) => {
          const y = i * ROW_H;
          const w = r.value === null ? 0 : Math.max(2, (r.value / max) * barW);
          const fill = r.accent === 'lead' ? '#34d399' : r.accent === 'alert' ? '#fb7185' : '#71717a';
          return (
            <g key={r.label} transform={`translate(0 ${y})`}>
              <text x={0} y={ROW_H / 2} dominantBaseline="middle" className="fill-zinc-400 font-mono text-[12px]">
                {r.label}
              </text>
              <rect x={LABEL_W} y={10} width={barW} height={ROW_H - 20} rx={4} className="fill-zinc-800/60" />
              <rect x={LABEL_W} y={10} width={w} height={ROW_H - 20} rx={4} fill={fill} />
              <text
                x={WIDTH}
                y={ROW_H / 2}
                dominantBaseline="middle"
                textAnchor="end"
                className="fill-zinc-200 font-mono text-[12px]"
              >
                {formatRate(r.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Bars for one rate across arms: the leader on intent, or a breaching arm on bounce, gets the accent. */
/** Accents only the verdict's leader (named with Flagsmith's win probability), never the raw top rate. */
export function intentBars(arms: ArmStats[], leader: HeroLayout | null): BarRow[] {
  return arms.map((a) => ({
    label: a.variant,
    value: a.intentRate,
    accent: leader !== null && a.variant === leader ? 'lead' : undefined,
  }));
}

export function bounceBars(arms: ArmStats[]): BarRow[] {
  return arms.map((a) => ({ label: a.variant, value: a.bounceRate, accent: a.guardrail === 'breach' ? 'alert' : undefined }));
}

const SOURCE_LABEL: Record<ConversionSource, string> = {
  clone_box: 'Clone box copy',
  quickstart_copy: 'Quickstart copy',
  github_cta: 'GitHub button',
};

/**
 * Confound check: unique visitors per conversion source, per arm, over views counted since source
 * tracking shipped. The clone box and GitHub button exist in both arms; the quickstart copy button
 * only in quickstart_first.
 */
export function SourceTable({ rows }: { rows: { variant: HeroLayout; counts: SourceCounts }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Conversions per source and variant, since source tracking started</caption>
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">Variant</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Visitors (n)</th>
            {CONVERSION_SOURCES.map((s) => (
              <th key={s} scope="col" className="px-4 py-3 text-right font-normal">
                {SOURCE_LABEL[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80 font-mono text-zinc-200 tabular-nums">
          {rows.map(({ variant, counts }) => (
            <tr key={variant}>
              <th scope="row" className="px-4 py-3 font-normal text-zinc-100">{variant}</th>
              <td className="px-4 py-3 text-right">{counts.views}</td>
              {CONVERSION_SOURCES.map((s) => (
                <td key={s} className="px-4 py-3 text-right">
                  {s === 'quickstart_copy' && variant !== 'quickstart_first' ? (
                    <span className="text-zinc-600">n/a</span>
                  ) : (
                    <>
                      {counts.bySource[s]} <span className="text-zinc-500">({formatRate(sourceRate(counts, s))})</span>
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const REASON_LABEL: Record<FallbackReason, string> = {
  no_client: 'no server key',
  request_failed: 'request failed',
  flag_missing: 'flag missing',
  flag_disabled: 'flag disabled',
  unknown_value: 'unknown value',
};

/**
 * Where each arm's visitors got their variant: Flagsmith (with or without a recorded exposure) or a
 * control fallback. Fallback visitors are in the live counters but Flagsmith never saw them.
 */
export function AssignmentSummary({ rows }: { rows: { variant: HeroLayout; counts: AssignmentCounts }[] }) {
  const fallbacks = rows.reduce((s, r) => s + r.counts.fallback, 0);
  const reasons = FALLBACK_REASONS.map((reason) => ({
    reason,
    n: rows.reduce((s, r) => s + r.counts.byReason[reason], 0),
  })).filter((r) => r.n > 0);
  const unexposed = rows.reduce((s, r) => s + (r.counts.flagsmith - r.counts.exposed), 0);

  return (
    <div className="space-y-3">
      <ul className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
        {rows.map(({ variant, counts }) => (
          <li key={variant} className="font-mono tabular-nums">
            <span className="text-zinc-100">{variant}</span>: Flagsmith {counts.flagsmith} (exposure recorded{' '}
            {counts.exposed}) · fallback {counts.fallback}
          </li>
        ))}
      </ul>
      {fallbacks > 0 ? (
        <p role="alert" className="flex gap-2 text-sm text-rose-300">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
          {fallbacks} visitor{fallbacks === 1 ? '' : 's'} got control because Flagsmith gave no usable answer (
          {reasons.map((r) => `${REASON_LABEL[r.reason]}: ${r.n}`).join(', ')}). They are in the counters on this
          page, but Flagsmith never saw them
        </p>
      ) : null}
      {unexposed > 0 ? (
        <p className="flex gap-2 text-sm text-amber-200/90">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          {unexposed} visitor{unexposed === 1 ? '' : 's'} got a variant from Flagsmith but no exposure was recorded (not
          enrolled in a running experiment in this environment)
        </p>
      ) : null}
    </div>
  );
}
