import 'server-only';
import type { FlagsmithConfig } from '@flagsmith/nodejs';

/**
 * Makes Flagsmith SDK failures readable in the Vercel logs.
 *
 * The SDK reports its own failures only through its logger: a 401 from the events API ("refused the
 * environment key … no longer tracking events"), dropped batches, `getIdentityFlags failed`. Its
 * default is a JSON pino logger, and `flushEvents()` never rejects, so none of that reaches our
 * own catch blocks. This adapter turns warn/error into plain `[flagsmith-sdk]` console lines.
 * Debug/info are dropped; evaluate.ts logs the fallback cases it cares about itself.
 */

type LogArgs = [unknown, ...unknown[]];

function describe(args: LogArgs): string {
  const [first, ...rest] = args;
  const parts: string[] = [];
  if (first instanceof Error) parts.push(errorMessage(first));
  else if (typeof first === 'string') parts.push(first);
  else if (first && typeof first === 'object' && 'err' in first) parts.push(errorMessage((first as { err: unknown }).err));
  for (const r of rest) if (typeof r === 'string') parts.push(r);
  return parts.join(' | ') || 'unknown SDK message';
}

/** An error's message plus its `cause` chain (the SDK wraps API errors in a generic one). */
export function errorMessage(err: unknown): string {
  const out: string[] = [];
  let e: unknown = err;
  for (let depth = 0; e && depth < 4; depth++) {
    out.push(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    e = e instanceof Error ? e.cause : undefined;
  }
  return out.join(' <- ') || String(err);
}

const noop = () => {};

function makeLogger(): Record<string, unknown> {
  const logger: Record<string, unknown> = {
    level: 'warn',
    trace: noop,
    debug: noop,
    info: noop,
    warn: (...args: LogArgs) => console.warn(`[flagsmith-sdk] ${describe(args)}`),
    error: (...args: LogArgs) => console.error(`[flagsmith-sdk] ${describe(args)}`),
    fatal: (...args: LogArgs) => console.error(`[flagsmith-sdk] ${describe(args)}`),
    silent: noop,
  };
  logger.child = () => logger;
  return logger;
}

/** Only debug/warn/error are called by @flagsmith/nodejs 9.x; the rest keep the pino shape. */
export const flagsmithLogger = makeLogger() as unknown as NonNullable<FlagsmithConfig['logger']>;

/**
 * Safe-to-log fingerprint of an environment key: type prefix, last 4 characters and length, e.g.
 * `ser.…xXAu (len 26)`. Compare the tail with `flagsmith api …/api-keys/` to see which key a deploy uses.
 */
export function keyFingerprint(key: string): string {
  const prefix = key.startsWith('ser.') ? 'ser.' : '(no ser. prefix) ';
  return `${prefix}…${key.slice(-4)} (len ${key.length})`;
}
