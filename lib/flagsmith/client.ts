import 'server-only';
import { Flagsmith } from '@flagsmith/nodejs';
import { serverEnv } from '@/lib/env';

/**
 * FR-6.3: one `@flagsmith/nodejs` (>= 9.1) client per server instance, with events enabled so
 * `getExperimentFlag` records exposures and `trackEvent` sends conversions.
 *
 * The app runs on AWS Amplify Hosting compute (Lambda), which can freeze the process as soon as a
 * response is sent; Amplify lists code after a response (`after()`) as unsupported. So the SDK's
 * background flush timer is off (`flushInterval: 0`) and every request that records an exposure or
 * event awaits `flushFlagsmith()` before responding (./flush.ts).
 *
 * Missing key → null: every visitor gets control and nothing is sent (CLAUDE.md rule 10).
 */

let client: Flagsmith | null | undefined;

export function getFlagsmith(): Flagsmith | null {
  if (client !== undefined) return client;
  const environmentKey = serverEnv(
    'FLAGSMITH_SERVER_KEY',
    'Flagsmith disabled, every visitor gets the control layout and no events are sent',
  );
  if (!environmentKey) return (client = null);

  const apiUrl = process.env.FLAGSMITH_API_URL?.trim() || undefined;
  const eventsApiUrl = process.env.FLAGSMITH_EVENTS_API_URL?.trim() || undefined;
  try {
    client = new Flagsmith({
      environmentKey,
      ...(apiUrl ? { apiUrl } : {}),
      // Keep the card's TTFB bounded; a timeout throws and the caller falls back to control.
      requestTimeoutSeconds: 2,
      retries: 0,
      enableEvents: true,
      eventProcessorConfig: {
        flushInterval: 0,
        requestTimeoutMs: 1500,
        ...(eventsApiUrl ? { eventsApiUrl } : {}),
      },
    });
  } catch (err) {
    console.error('[flagsmith] client init failed, serving control', err);
    client = null;
  }
  return client;
}
