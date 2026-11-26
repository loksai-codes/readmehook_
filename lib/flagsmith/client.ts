import 'server-only';
import { Flagsmith } from '@flagsmith/nodejs';
import { serverEnv } from '@/lib/env';
import { errorMessage, flagsmithLogger, keyFingerprint } from './logger';

/**
 * FR-6.3: one `@flagsmith/nodejs` (>= 9.1) client per server instance, with events enabled so
 * `getExperimentFlag` records exposures and `trackEvent` sends conversions.
 *
 * On Vercel a function instance can be suspended between requests, so the SDK's background flush
 * timer is off (`flushInterval: 0`). Every request that records an exposure or event schedules
 * `flushFlagsmith()` with Next's `after()`, which Vercel keeps alive via `waitUntil` (./flush.ts).
 *
 * Missing key → null: every visitor gets control and nothing is sent (CLAUDE.md rule 10).
 *
 * Each cold start logs which key it uses (fingerprint only) and SDK failures go through
 * ./logger.ts, so a wrong or rejected key shows up in the Vercel logs instead of silently
 * turning every visit into a control fallback.
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
      logger: flagsmithLogger,
      eventProcessorConfig: {
        flushInterval: 0,
        requestTimeoutMs: 1500,
        ...(eventsApiUrl ? { eventsApiUrl } : {}),
      },
    });
    console.info(
      `[flagsmith] client ready: env=${process.env.FLAGSMITH_ENV_NAME ?? '(unset)'} key=${keyFingerprint(environmentKey)}`,
    );
  } catch (err) {
    console.error(`[flagsmith] client init failed, serving control: ${errorMessage(err)}`);
    client = null;
  }
  return client;
}
