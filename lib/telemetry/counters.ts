import 'server-only';
import { toCounters, type ArmCounters } from '@/lib/advice/verdict';
import { HERO_LAYOUTS, type HeroLayout } from '@/lib/flagsmith/variants';
import { getRedis } from '@/lib/redis/client';
import { keys } from '@/lib/redis/keys';
import { toSourceCounts, type SourceCounts } from './sources';

export type ArmCounterMap = Record<HeroLayout, ArmCounters>;

export interface LanguageRow {
  language: string;
  arms: ArmCounterMap;
}

export interface InsightsCounters {
  /** The TELEMETRY_PREFIX these counters were read under ("" in production). */
  prefix: string;
  global: ArmCounterMap;
  /** Confound check: per-source unique visitors per arm, from the same global hashes. */
  sources: Record<HeroLayout, SourceCounts>;
  languages: LanguageRow[];
  /** False when Redis is missing or failed; the page then says so instead of showing zeros. */
  available: boolean;
}

async function readHashes(keyFor: (v: HeroLayout) => string): Promise<(Record<string, unknown> | null)[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  const pipe = redis.pipeline();
  for (const v of HERO_LAYOUTS) pipe.hgetall(keyFor(v));
  return (await pipe.exec()) as (Record<string, unknown> | null)[];
}

function perArm<T>(rows: (Record<string, unknown> | null)[], map: (row: Record<string, unknown> | null) => T) {
  return Object.fromEntries(HERO_LAYOUTS.map((v, i) => [v, map(rows[i] ?? null)])) as Record<HeroLayout, T>;
}

async function readArms(keyFor: (v: HeroLayout) => string): Promise<ArmCounterMap | null> {
  const rows = await readHashes(keyFor);
  return rows ? perArm(rows, toCounters) : null;
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
  const noSources = Object.fromEntries(HERO_LAYOUTS.map((v) => [v, toSourceCounts(null)])) as Record<
    HeroLayout,
    SourceCounts
  >;
  const unavailable = { prefix, global: empty, sources: noSources, languages: [], available: false };
  const redis = getRedis();
  if (!redis) return unavailable;
  try {
    const [globalRows, languageNames] = await Promise.all([
      readHashes((v) => keys.expVariant(v)),
      redis.smembers(keys.expLangs()),
    ]);
    const global = globalRows ? perArm(globalRows, toCounters) : null;
    const sources = globalRows ? perArm(globalRows, toSourceCounts) : noSources;
    const names = [...new Set((languageNames ?? []).map(String))].sort((a, b) => a.localeCompare(b));
    const languages = await Promise.all(
      names.map(async (language) => ({
        language,
        arms: (await readArms((v) => keys.expLangVariant(language, v))) ?? empty,
      })),
    );
    return { prefix, global: global ?? empty, sources, languages, available: true };
  } catch (err) {
    console.warn('[counters] insights read failed', err);
    return unavailable;
  }
}
