import 'server-only';
import type { EventName } from '@/lib/telemetry/events';
import { getFlagsmith } from './client';

/**
 * FR-7.3: buffer a conversion/telemetry event for the `rh_vid` identity. The name comes from the
 * event contract and matches the Flagsmith metric event exactly. Flush afterwards (./flush.ts).
 * Returns false when Flagsmith is disabled or the SDK refused the event. Never throws.
 */
export function trackFlagsmithEvent(visitorId: string, event: EventName): boolean {
  const flagsmith = getFlagsmith();
  if (!flagsmith) return false;
  try {
    flagsmith.trackEvent(event, { identifier: visitorId });
    return true;
  } catch (err) {
    console.warn(`[flagsmith] trackEvent ${event} failed`, err);
    return false;
  }
}
