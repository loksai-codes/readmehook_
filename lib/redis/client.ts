import 'server-only';
import { Redis } from '@upstash/redis';
import { serverEnv } from '@/lib/env';

/**
 * Upstash Redis REST client. Redis is required in every environment; the only fallback is for a
 * missing URL/token, in which case cache reads miss, writes are skipped, and the missing var is
 * logged. Runtime Redis errors are logged and swallowed so the card page never 500s.
 */

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const consequence = 'Redis disabled, GitHub snapshots will not be cached';
  const url = serverEnv('UPSTASH_REDIS_REST_URL', consequence);
  const token = serverEnv('UPSTASH_REDIS_REST_TOKEN', consequence);
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (err) {
    console.warn(`[redis] get ${key} failed`, err);
    return null;
  }
}

export async function cacheSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[redis] set ${key} failed`, err);
  }
}
