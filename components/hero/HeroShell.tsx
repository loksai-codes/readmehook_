import type { ReactNode } from 'react';
import { CopyCommandButton } from '@/components/telemetry/CopyCommandButton';
import { GitHubCta } from '@/components/telemetry/GitHubCta';
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { homepageLink } from '@/lib/github/homepage';
import { languageColor } from '@/lib/github/languages';
import type { RepoMeta } from '@/lib/github/types';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const MAX_TOPICS = 8;

/**
 * Shared chrome, identical for every variant (FR-4.2, CLAUDE.md rule 7): name, tagline, stats,
 * topics, homepage, the clone box and the GitHub CTA. Only `children` (the hero block) differs.
 */
export function HeroShell({
  meta,
  cloneCommand,
  variant,
  children,
}: {
  meta: RepoMeta;
  cloneCommand: string;
  variant: HeroLayout;
  children: ReactNode;
}) {
  const homepage = homepageLink(meta.homepage);
  const topics = meta.topics.slice(0, MAX_TOPICS);

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Soft accent light behind the title; decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(45%_55%_at_50%_0%,rgba(52,211,153,0.13),transparent_75%)]"
      />
      <article className="mx-auto w-full max-w-4xl px-4 pt-6 pb-16 sm:px-6 sm:pt-12" data-variant={variant}>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_32px_64px_-32px_rgba(0,0,0,0.9)]">
          <header className="px-5 pt-6 pb-6 sm:px-8 sm:pt-8">
            <div className="flex items-center gap-2.5 text-sm text-zinc-400">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny avatar from GitHub's CDN */}
              <img
                src={meta.avatarUrl}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full bg-zinc-800 ring-1 ring-white/10"
              />
              <span>{meta.owner}</span>
            </div>

            <h1 className="mt-3 text-[2rem] leading-[1.1] font-semibold tracking-tight break-words text-zinc-50 sm:text-5xl">
              {meta.repo}
            </h1>
            {meta.description ? (
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-pretty text-zinc-300 sm:text-xl">
                {meta.description}
              </p>
            ) : null}

            <ul
              className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400"
              aria-label="Repository details"
            >
              <li className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-amber-300/90">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                </svg>
                {compact.format(meta.stars)}
                <span className="sr-only">stars</span>
              </li>
              {meta.language ? (
                <li className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: languageColor(meta.language) }}
                  />
                  {meta.language}
                </li>
              ) : null}
              {homepage ? (
                <li className="min-w-0">
                  <a
                    href={homepage.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-zinc-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-zinc-500">
                      <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z" />
                    </svg>
                    <span className="truncate">{homepage.label}</span>
                  </a>
                </li>
              ) : null}
            </ul>

            {topics.length ? (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Topics">
                {topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-xs text-zinc-400"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <div className="grid gap-3 border-t border-white/[0.06] bg-black/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
            <CloneBlock command={cloneCommand} repoSlug={meta.fullName} variant={variant} />
            <GitHubCta
              href={meta.htmlUrl}
              repoSlug={meta.fullName}
              variant={variant}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-colors hover:bg-emerald-300 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
              View on GitHub · Star
            </GitHubCta>
          </div>
        </div>

        <section aria-label="Highlights" className="mt-6 sm:mt-8">
          {children}
        </section>
      </article>
    </div>
  );
}

/**
 * The clone command as wrapped terminal lines (one per `&&` step), with the copy button inside the
 * block. Copies the exact same command as before, so `clone_command_copied` is unchanged.
 */
function CloneBlock({ command, repoSlug, variant }: { command: string; repoSlug: string; variant: HeroLayout }) {
  const steps = command.split(/\s*&&\s*/).filter(Boolean);
  return (
    <div className="relative min-w-0 rounded-xl border border-white/[0.08] bg-zinc-950 py-3 pr-24 pl-4 font-mono text-[13px] leading-6 text-zinc-200 sm:text-sm">
      <p className="sr-only">Clone command</p>
      {steps.map((step, i) => (
        <div key={i} className="flex gap-2">
          <span aria-hidden="true" className="text-emerald-400 select-none">
            $
          </span>
          <code className="min-w-0 [overflow-wrap:break-word]">
            {/* Break long URLs after slashes, not mid-word. */}
            {step.split('/').map((part, j, all) => (
              <span key={j}>
                {part}
                {j < all.length - 1 ? (
                  <>
                    /<wbr />
                  </>
                ) : null}
              </span>
            ))}
          </code>
        </div>
      ))}
      <div className="absolute top-2.5 right-2.5">
        <CopyCommandButton text={command} label="Copy" repoSlug={repoSlug} variant={variant} source="clone_box" />
      </div>
    </div>
  );
}
