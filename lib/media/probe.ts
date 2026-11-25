import 'server-only';
import { cacheGetJSON, cacheSetJSON } from '@/lib/redis/client';
import { keys, TTL } from '@/lib/redis/keys';

/** FR-4.5: media above this size is not inlined (it would stall load and skew the bounce guardrail). */
export const MEDIA_SIZE_CAP_BYTES = 15 * 1024 * 1024;

const PROBE_TIMEOUT_MS = 1500;

/**
 * HEAD-probes a media URL for its Content-Length, cached in Redis for 24 h.
 * Returns null when unknown (no header, timeout, error); unknown sizes are allowed through.
 */
export async function probeMediaBytes(url: string): Promise<number | null> {
  const key = keys.mediaSize(url);
  const cached = await cacheGetJSON<{ bytes: number | null }>(key);
  if (cached) return cached.bytes;

  let bytes: number | null = null;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const len = Number(res.headers.get('content-length'));
    bytes = res.ok && Number.isFinite(len) && len > 0 ? len : null;
  } catch {
    bytes = null;
  }
  await cacheSetJSON(key, { bytes }, TTL.GH_STALE_S);
  return bytes;
}

export function isOverCap(bytes: number | null): boolean {
  return bytes !== null && bytes > MEDIA_SIZE_CAP_BYTES;
}
