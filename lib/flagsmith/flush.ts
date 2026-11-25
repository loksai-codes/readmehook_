import 'server-only';
import { getFlagsmith } from './client';

/** Upper bound on how long a request waits for buffered Flagsmith events to be posted. */
export const FLUSH_TIMEOUT_MS = 5000;

/**
 * FR-6.3 / CLAUDE.md rule 5: send buffered exposures and events now. Callers schedule it with
 * `after(flushFlagsmith)` so it runs once the response has streamed; on Vercel, `after()` is backed
 * by `waitUntil`, which keeps the function alive until the flush settles. Capped at FLUSH_TIMEOUT_MS
 * and never throws. Events still buffered when the cap hits go with the next flush on this instance.
 */
export async function flushFlagsmith(timeoutMs: number = FLUSH_TIMEOUT_MS): Promise<void> {
  const flagsmith = getFlagsmith();
  if (!flagsmith) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  try {
    const result = await Promise.race([flagsmith.flushEvents().then(() => 'flushed' as const), timeout]);
    if (result === 'timeout') console.warn(`[flagsmith] flush exceeded ${timeoutMs} ms, continuing`);
  } catch (err) {
    console.warn('[flagsmith] flush failed', err);
  } finally {
    clearTimeout(timer);
  }
}
