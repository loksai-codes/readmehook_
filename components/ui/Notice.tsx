import Link from 'next/link';

/** Friendly error/empty state for card and stats pages (FR-2.6). */
export function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-medium text-zinc-50">{title}</h1>
        <p className="mt-2 text-zinc-400">{body}</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-sm text-sm text-zinc-200 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          Try another repo
        </Link>
      </div>
    </div>
  );
}
