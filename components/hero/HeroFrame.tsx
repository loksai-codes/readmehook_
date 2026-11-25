import type { ReactNode } from 'react';

/**
 * Fixed-size frame every variant renders into, so all three heroes occupy the same space and the
 * shared shell (clone box, GitHub CTA) sits in the same place for every visitor (CLAUDE.md rule 7).
 */
export function HeroFrame({
  eyebrow,
  title,
  caption,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  caption?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[24rem] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 sm:h-[26rem]">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-500">{eyebrow}</p>
          <h2 className="truncate text-sm font-medium text-zinc-100">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
      {caption ? <p className="border-t border-zinc-800/80 px-5 py-2 text-xs text-zinc-500">{caption}</p> : null}
    </div>
  );
}
