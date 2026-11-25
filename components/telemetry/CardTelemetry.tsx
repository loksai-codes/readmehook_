'use client';

import { useEffect, useRef } from 'react';
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { shouldSendBounce } from '@/lib/telemetry/bounce';
import { hasConverted, trackExperimentEvent } from '@/lib/telemetry/client';
import { EVENTS } from '@/lib/telemetry/events';

interface Props {
  repoSlug: string;
  variant: HeroLayout;
}

/** FR-7.2: `card_view` once on mount. */
export function CardViewTracker({ repoSlug, variant }: Props) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackExperimentEvent(EVENTS.CARD_VIEW, { repoSlug, variant });
  }, [repoSlug, variant]);
  return null;
}

/**
 * FR-7.4 guardrail: the clock starts at mount. On the first `visibilitychange → hidden` or
 * `pagehide`, if under 5 s and no conversion fired, send `bounce_under_5s` by beacon. At most once.
 */
export function BounceGuardrail({ repoSlug, variant }: Props) {
  useEffect(() => {
    const start = performance.now();
    let alreadySent = false;

    const maybeSend = () => {
      const send = shouldSendBounce({
        elapsedMs: performance.now() - start,
        converted: hasConverted(repoSlug),
        alreadySent,
      });
      if (!send) return;
      alreadySent = true;
      trackExperimentEvent(EVENTS.BOUNCE_UNDER_5S, { repoSlug, variant }, { beacon: true });
    };
    const onLeave = () => {
      if (document.visibilityState === 'hidden') maybeSend();
    };
    // pagehide can fire before visibilityState flips, so it counts as leaving on its own.
    const onPageHide = maybeSend;

    document.addEventListener('visibilitychange', onLeave);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onLeave);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [repoSlug, variant]);
  return null;
}
