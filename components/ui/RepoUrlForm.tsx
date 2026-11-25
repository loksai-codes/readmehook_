'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { cardPath } from '@/lib/advice/share';
import { parseRepoInput } from '@/lib/github/slug';

/** FR-1.1 / FR-1.2: accepts a GitHub URL or owner/repo and navigates to the card. */
export function RepoUrlForm() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const slug = parseRepoInput(value);
    if (!slug) {
      setError('Enter a public GitHub repo, e.g. github.com/vercel/next.js or vercel/next.js');
      return;
    }
    setError(null);
    // FR-1.3: the creator lands on their card with the share panel; their view is not counted.
    router.push(`${cardPath(slug.owner, slug.repo)}?created=1`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <label htmlFor={inputId} className="sr-only">
        GitHub repository URL
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          placeholder="https://github.com/owner/repo"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-white active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
        >
          Make my card
        </button>
      </div>
      <p id={errorId} role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm text-rose-400">
        {error}
      </p>
    </form>
  );
}
