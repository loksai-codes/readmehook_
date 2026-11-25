import type { ReactNode } from 'react';
import { CopyCommandButton } from '@/components/telemetry/CopyCommandButton';
import { GitHubCta } from '@/components/telemetry/GitHubCta';
import { languageColor } from '@/lib/github/languages';
import type { RepoMeta } from '@/lib/github/types';
import type { HeroLayout } from '@/lib/flagsmith/variants';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Shared chrome, identical for every variant (FR-4.2, CLAUDE.md rule 7): name, description, stars,
 * language, clone copy box and GitHub CTA. Only `children` (the hero block) differs per variant.
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
  return (
    <article className="mx-auto w-full max-w-4xl px-5 pt-8 pb-12 sm:px-6 sm:pt-12" data-variant={variant}>
      <header>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny avatar from GitHub's CDN */}
          <img src={meta.avatarUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full bg-zinc-800" />
          <span>{meta.owner}</span>
        </div>
        <h1 className="mt-2 text-3xl font-medium tracking-tight break-words text-zinc-50 sm:text-4xl">{meta.repo}</h1>
        {meta.description ? (
          <p className="mt-2 max-w-2xl text-base text-pretty text-zinc-400 sm:text-lg">{meta.description}</p>
        ) : null}
        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-zinc-400 tabular-nums" aria-label="Repository stats">
          <li className="inline-flex items-center gap-2">
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-zinc-500">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
            <span>
              {compact.format(meta.stars)} <span className="sr-only">stars</span>
            </span>
          </li>
          {meta.language ? (
            <li className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: languageColor(meta.language) }}
              />
              {meta.language}
            </li>
          ) : null}
        </ul>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-2 pl-4">
          <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap text-zinc-200">
            <span className="text-emerald-400 select-none">$ </span>
            {cloneCommand}
          </code>
          <CopyCommandButton text={cloneCommand} label="Copy" repoSlug={meta.fullName} variant={variant} />
        </div>
        <GitHubCta
          href={meta.htmlUrl}
          repoSlug={meta.fullName}
          variant={variant}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          View on GitHub · Star
        </GitHubCta>
      </div>

      <section aria-label="Highlights" className="mt-6">
        {children}
      </section>
    </article>
  );
}
