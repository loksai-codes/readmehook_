/** FR-7.4 bounce guardrail decision. Pure. */
import { BOUNCE_THRESHOLD_MS } from './events';

export function shouldSendBounce(state: { elapsedMs: number; converted: boolean; alreadySent: boolean }): boolean {
  return !state.alreadySent && !state.converted && state.elapsedMs < BOUNCE_THRESHOLD_MS;
}
