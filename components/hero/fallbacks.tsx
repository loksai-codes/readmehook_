import type { CSSProperties } from 'react';

/** Demo fallback when the repo has a homepage: a stylised browser frame (no iframe). */
export function BrowserFrame({ homepage, name, description }: { homepage: string; name: string; description: string | null }) {
  let host = homepage;
  try {
    host = new URL(homepage).host;
  } catch {
    /* keep raw */
  }
  return (
    <div className="flex min-h-72 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-3 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        </div>
        <div className="flex-1 truncate rounded-md bg-zinc-950 px-3 py-1 text-center font-mono text-xs text-zinc-400">
          {host}
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-2xl font-medium text-zinc-50">{name}</p>
        {description ? <p className="line-clamp-2 max-w-md text-sm text-zinc-400">{description}</p> : null}
        <a
          href={homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          Open live demo ↗
        </a>
      </div>
    </div>
  );
}

/** Demo fallback without a homepage: an animated terminal replaying the quickstart. */
export function TerminalMockup({ command, repo }: { command: string; repo: string }) {
  const lines = command
    .split('\n')
    .slice(0, 6)
    .map((text) => ({ text, n: Math.min(text.length, 90) }));
  const delays = lines.reduce<number[]>((acc, line, i) => {
    acc.push(i === 0 ? 300 : acc[i - 1]! + lines[i - 1]!.n * 35 + 500);
    return acc;
  }, []);
  const last = lines.length - 1;
  const cursorDelay = last >= 0 ? delays[last]! + lines[last]!.n * 35 + 500 : 300;
  return (
    <div className="min-h-56 w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1117] font-mono text-[13px]">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-2" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-[11px] text-zinc-500">{repo} — demo</span>
      </div>
      <div
        className="space-y-1.5 overflow-hidden p-4"
        aria-label={`Terminal: ${lines.map((l) => l.text).join('; ')}`}
        role="img"
      >
        {lines.map((line, i) => (
          <div key={i} className="flex whitespace-pre text-zinc-200">
            <span className="mr-2 text-emerald-400">$</span>
            <span className="rh-type" style={{ '--n': line.n, '--d': `${delays[i]}ms` } as CSSProperties}>
              {line.text}
            </span>
          </div>
        ))}
        <div className="flex text-zinc-200">
          <span className="mr-2 text-emerald-400">$</span>
          <span className="rh-cursor" style={{ '--d': `${cursorDelay}ms` } as CSSProperties} />
        </div>
      </div>
    </div>
  );
}
