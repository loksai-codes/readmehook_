import Link from 'next/link';
import { HERO_LAYOUTS, type HeroLayout, type HeroTraits } from '@/lib/flagsmith/variants';
import type { RequestKind } from '@/lib/identity/request';

/** Development-only review aid (Milestone 2). The page never renders this when NODE_ENV === 'production'. */
export function DevVariantToolbar({
  path,
  variant,
  overridden,
  kind,
  visitorId,
  traits,
}: {
  path: string;
  variant: HeroLayout;
  overridden: boolean;
  kind: RequestKind;
  visitorId: string | null;
  traits: HeroTraits;
}) {
  return (
    <aside
      aria-label="Development variant switcher"
      className="mx-auto mb-8 w-full max-w-4xl px-5 sm:px-6"
    >
      <div className="rounded-lg border border-dashed border-amber-400/40 bg-amber-400/5 p-3 font-mono text-[11px] text-amber-200/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-amber-300">DEV</span>
          {HERO_LAYOUTS.map((v) => (
            <Link
              key={v}
              href={`${path}?variant=${v}`}
              className={`rounded px-2 py-0.5 ${v === variant ? 'bg-amber-300 text-zinc-950' : 'border border-amber-400/30 hover:bg-amber-400/10'}`}
            >
              {v}
            </Link>
          ))}
          <Link href={path} className="underline-offset-2 hover:underline">
            reset
          </Link>
        </div>
        <p className="mt-2 break-all">
          variant={variant}
          {overridden ? ' (forced)' : ' (default: control until Flagsmith is wired)'} · request={kind} · rh_vid=
          {visitorId ?? 'none'}
        </p>
        <p className="mt-1 break-all">traits={JSON.stringify(traits)}</p>
      </div>
    </aside>
  );
}
