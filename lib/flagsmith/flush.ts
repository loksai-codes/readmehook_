import 'server-only';
import { getFlagsmith } from './client';

/** Upper bound on how long a request waits for buffered Flagsmith events to be posted. */
export const FLUSH_TIMEOUT_MS = 1500;

/**
 * FR-6.3 / CLAUDE.md rule 5: send buffered exposures and events now. Awaited inline before the
 * response because Lambda (AWS Amplify) may freeze the process right after it, which would strand
 * anything left for `after()`. Capped at FLUSH_TIMEOUT_MS and never throws. Events still buffered
 * when the cap hits are sent with the next flush on this instance.
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
