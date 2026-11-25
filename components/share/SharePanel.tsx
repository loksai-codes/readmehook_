'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
import { CopyButton } from '@/components/ui/CopyButton';
import { cardPath, cardUrl, discordPrompt } from '@/lib/advice/share';

const noop = () => () => {};

/** The page's own origin, so share links are right on every deploy without extra config. */
function useOrigin(fallback: string): string {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => fallback,
  );
}

/**
 * FR-1.3 / FR-9.2: shown to the creator right after generating a card (`?created=1`). Share link,
 * Discord prompt with `?ref=discord`, and the way to the stats page. The `created` flag is dropped
 * from the address bar so a copied URL or a refresh is an ordinary visit.
 */
export function SharePanel({ owner, repo, siteUrl }: { owner: string; repo: string; siteUrl: string }) {
  const origin = useOrigin(siteUrl);
  const link = cardUrl(origin, owner, repo);
  const prompt = discordPrompt(origin, owner, repo);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('created')) {
      url.searchParams.delete('created');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  }, []);

  return (
    <section
      aria-labelledby="share-title"
      className="mx-auto mb-8 w-full max-w-4xl px-5 pt-8 sm:px-6 sm:pt-12"
    >
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="share-title" className="text-sm font-medium text-zinc-100">
            Your card is ready
          </h2>
          <p className="text-xs text-zinc-500">Only you see this panel. Your own view isn&apos;t counted in the test</p>
        </div>

        <div className="mt-4 flex min-w-0 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 py-2 pr-2 pl-4">
          <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap text-zinc-200">{link}</code>
          <CopyButton text={link} label="Copy link" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400">Discord message, links with ?ref=discord</p>
            <CopyButton text={prompt} label="Copy message" />
          </div>
          <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-300">
            {prompt}
          </p>
        </div>

        <Link
          href={`${cardPath(owner, repo)}/stats`}
          className="mt-4 inline-block rounded-sm text-sm text-zinc-200 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          README audit and stats
        </Link>
      </div>
    </section>
  );
}
