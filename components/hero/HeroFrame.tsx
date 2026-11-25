import type { ReactNode } from 'react';

/**
 * The frame every variant renders into (same chrome for all three, CLAUDE.md rule 7). It sizes to
 * its content: the shared shell (clone box, GitHub CTA) sits above it, so hero height never moves
 * the CTAs, and a fixed tall box only left small diagrams floating in empty space.
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
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-500">{eyebrow}</p>
          <h2 className="mt-0.5 truncate text-[15px] font-medium text-zinc-100">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="relative">{children}</div>
      {caption ? (
        <p className="border-t border-white/[0.06] px-5 py-3 text-xs text-zinc-500 sm:px-6">{caption}</p>
      ) : null}
    </div>
  );
}
