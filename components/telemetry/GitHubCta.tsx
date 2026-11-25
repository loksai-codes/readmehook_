'use client';

import type { ReactNode } from 'react';
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { trackConversion } from '@/lib/telemetry/client';
import { EVENTS } from '@/lib/telemetry/events';

/**
 * Outbound GitHub link (FR-7.5). The event goes by `sendBeacon` before the browser navigates, so it
 * is not lost; the link itself is a plain anchor and still works without JS. Middle clicks count too.
 */
export function GitHubCta({
  href,
  repoSlug,
  variant,
  className,
  children,
}: {
  href: string;
  repoSlug: string;
  variant: HeroLayout;
  className?: string;
  children: ReactNode;
}) {
  const track = () => trackConversion(EVENTS.GITHUB_OUTBOUND_CLICK, { repoSlug, variant }, { beacon: true });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={track}
      onAuxClick={(e) => {
        if (e.button === 1) track();
      }}
    >
      {children}
    </a>
  );
}
