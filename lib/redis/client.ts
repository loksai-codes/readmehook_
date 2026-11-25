import 'server-only';
import { Redis } from '@upstash/redis';

/**
 * Upstash Redis REST client. Returns null when not configured so callers can fail open
 * (CLAUDE.md rule 10). Cache helpers fall back to a small in-process map in that case,
 * which keeps local dev usable without Upstash credentials.
 */

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

const MEMORY_MAX_ENTRIES = 200;
const memory = new Map<string, { value: unknown; expiresAt: number }>();

export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) {
    const hit = memory.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return hit.value as T;
  }
  try {
    return await redis.get<T>(key);
  } catch (err) {
    console.warn(`[redis] get ${key} failed`, err);
    return null;
  }
}

export async function cacheSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    if (memory.size >= MEMORY_MAX_ENTRIES) {
      const oldest = memory.keys().next().value;
      if (oldest !== undefined) memory.delete(oldest);
    }
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return;
  }
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[redis] set ${key} failed`, err);
  }
}
