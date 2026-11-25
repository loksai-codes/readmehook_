import 'server-only';
import { flushFlagsmith } from '@/lib/flagsmith/flush';
import { trackFlagsmithEvent } from '@/lib/flagsmith/track';
import type { RepoSnapshot } from '@/lib/github/types';
import { cacheGetJSON, getRedis } from '@/lib/redis/client';
import { keys, TTL } from '@/lib/redis/keys';
import { COUNTER_FIELD, TRACK_RATE_LIMIT_PER_MIN } from './events';
import type { TrackBody } from './schema';

/**
 * FR-7.6: at most TRACK_RATE_LIMIT_PER_MIN events per visitor per minute (fixed window).
 * Fails open when Redis is missing or erroring.
 */
export async function isRateLimited(visitorId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const key = keys.rateLimit(visitorId);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, TTL.RATE_LIMIT_S);
    return count > TRACK_RATE_LIMIT_PER_MIN;
  } catch (err) {
    console.warn('[track] rate limit check failed, allowing', err);
    return false;
  }
}

/** Repo language from the cached GitHub snapshot (never from the request body). */
async function repoLanguage(repoSlug: string): Promise<string | null> {
  const [owner, repo] = repoSlug.split('/') as [string, string];
  const snapshot = await cacheGetJSON<RepoSnapshot>(keys.ghSnapshot(owner, repo));
  return snapshot?.meta.language ?? null;
}

/**
 * Redis live counters (FR-7.3): SADD the visitor into the metric's unique set, and only when that
 * returns 1, HINCRBY the repo hash, the global per-variant hash and the per-language hash.
 * Returns whether this was the visitor's first occurrence (null if Redis is unavailable).
 */
export async function recordRedisCounters(visitorId: string, body: TrackBody): Promise<boolean | null> {
  const redis = getRedis();
  if (!redis) return null;
  const field = COUNTER_FIELD[body.event];
  try {
    const added = await redis.sadd(keys.repoVariantUniq(body.repoSlug, body.variant, field), visitorId);
    if (added !== 1) return false;
    const language = await repoLanguage(body.repoSlug);
    const pipe = redis.pipeline();
    pipe.hincrby(keys.repoVariant(body.repoSlug, body.variant), field, 1);
    pipe.hincrby(keys.expVariant(body.variant), field, 1);
    if (language) pipe.hincrby(keys.expLangVariant(language, body.variant), field, 1);
    await pipe.exec();
    return true;
  } catch (err) {
    console.warn(`[track] redis counters for ${body.event} failed`, err);
    return null;
  }
}

/**
 * FR-7.3 dual-write. Every allow-listed event is sent to Flagsmith for the `rh_vid` identity (the
 * experiment's source of truth) and counted in Redis (deduplicated per visitor). Flagsmith is
 * flushed before returning, so the event is posted before Lambda can freeze (CLAUDE.md rule 5).
 */
export async function recordEvent(
  visitorId: string,
  body: TrackBody,
): Promise<{ flagsmith: boolean; redisFirst: boolean | null }> {
  const flagsmith = trackFlagsmithEvent(visitorId, body.event);
  const [redisFirst] = await Promise.all([
    recordRedisCounters(visitorId, body),
    flagsmith ? flushFlagsmith() : Promise.resolve(),
  ]);
  return { flagsmith, redisFirst };
}
