import 'server-only';
import { toCounters, type ArmCounters } from '@/lib/advice/verdict';
import { HERO_LAYOUTS, type HeroLayout } from '@/lib/flagsmith/variants';
import { getRedis } from '@/lib/redis/client';
import { keys } from '@/lib/redis/keys';

export type ArmCounterMap = Record<HeroLayout, ArmCounters>;

export interface LanguageRow {
  language: string;
  arms: ArmCounterMap;
}

export interface InsightsCounters {
  /** The TELEMETRY_PREFIX these counters were read under ("" in production). */
  prefix: string;
  global: ArmCounterMap;
  languages: LanguageRow[];
  /** False when Redis is missing or failed; the page then says so instead of showing zeros. */
  available: boolean;
}

async function readArms(keyFor: (v: HeroLayout) => string): Promise<ArmCounterMap | null> {
  const redis = getRedis();
  if (!redis) return null;
  const pipe = redis.pipeline();
  for (const v of HERO_LAYOUTS) pipe.hgetall(keyFor(v));
  const rows = (await pipe.exec()) as (Record<string, unknown> | null)[];
  return Object.fromEntries(HERO_LAYOUTS.map((v, i) => [v, toCounters(rows[i])])) as ArmCounterMap;
}

/** Live counters for one repo (FR-8.3). Null when Redis is unavailable. Never throws. */
export async function readRepoCounters(repoSlug: string): Promise<ArmCounterMap | null> {
  try {
    return await readArms((v) => keys.repoVariant(repoSlug, v));
  } catch (err) {
    console.warn(`[counters] repo ${repoSlug} read failed`, err);
    return null;
  }
}

/** Global + per-language live counters for /insights (FR-10.1, FR-10.2). Never throws. */
export async function readInsightsCounters(): Promise<InsightsCounters> {
  const prefix = process.env.TELEMETRY_PREFIX ?? '';
  const empty = Object.fromEntries(HERO_LAYOUTS.map((v) => [v, toCounters(null)])) as ArmCounterMap;
  const redis = getRedis();
  if (!redis) return { prefix, global: empty, languages: [], available: false };
  try {
    const [global, languageNames] = await Promise.all([
      readArms((v) => keys.expVariant(v)),
      redis.smembers(keys.expLangs()),
    ]);
    const names = [...new Set((languageNames ?? []).map(String))].sort((a, b) => a.localeCompare(b));
    const languages = await Promise.all(
      names.map(async (language) => ({
        language,
        arms: (await readArms((v) => keys.expLangVariant(language, v))) ?? empty,
      })),
    );
    return { prefix, global: global ?? empty, languages, available: true };
  } catch (err) {
    console.warn('[counters] insights read failed', err);
    return { prefix, global: empty, languages: [], available: false };
  }
}
