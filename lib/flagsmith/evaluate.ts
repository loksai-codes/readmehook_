import 'server-only';
import { getFlagsmith } from './client';
import { errorMessage } from './logger';
import {
  CONTROL,
  FLAG_KEY,
  HERO_LAYOUTS,
  type FallbackReason,
  type HeroAssignment,
  type HeroLayout,
  type HeroTraits,
} from './variants';

function fallback(reason: FallbackReason, detail: string): HeroAssignment {
  // One line per fallback, so a broken key or outage is visible in the logs, never silent.
  console.error(`[flagsmith] ${FLAG_KEY} fallback to control: reason=${reason} env=${process.env.FLAGSMITH_ENV_NAME ?? '(unset)'} ${detail}`);
  return { variant: CONTROL, source: 'fallback', reason };
}

/**
 * FR-6.1 / FR-6.2: identify `rh_vid` with the hero traits and evaluate `repo_hero_layout` through
 * the experiment-flag API, which records the exposure in the same call. Call it only for real human
 * page views (never bots, OG or prefetch), and flush afterwards (./flush.ts).
 *
 * Fails open to CONTROL (CLAUDE.md rule 10, NFR-2), and says so: the result carries `source` and
 * a reason, so callers can record it (Redis) and every fallback is logged. There is deliberately no
 * extra timeout around the call: the SDK's own request timeout throws before an exposure is
 * recorded, whereas racing it here could record an exposure for a variant the visitor never saw.
 */
export async function evaluateHeroLayout(visitorId: string, traits: HeroTraits): Promise<HeroAssignment> {
  const flagsmith = getFlagsmith();
  if (!flagsmith) return fallback('no_client', 'FLAGSMITH_SERVER_KEY missing or client init failed');

  let flag: Awaited<ReturnType<typeof flagsmith.getExperimentFlag>>;
  try {
    flag = await flagsmith.getExperimentFlag(FLAG_KEY, visitorId, { ...traits });
  } catch (err) {
    return fallback('request_failed', errorMessage(err));
  }

  if (flag.isDefault) return fallback('flag_missing', 'feature not returned for this environment');
  if (!flag.enabled) return fallback('flag_disabled', 'feature is disabled in this environment');
  if (!HERO_LAYOUTS.includes(flag.value as HeroLayout)) {
    return fallback('unknown_value', `value=${JSON.stringify(flag.value)}`);
  }

  const variant = flag.value as HeroLayout;
  // Same conditions the SDK checks before recording an exposure (getExperimentFlag, 9.x).
  const exposed = 'experiment' in flag && Boolean(flag.experiment?.inExperiment) && flag.variant !== undefined;
  if (!exposed) {
    console.warn(
      `[flagsmith] ${FLAG_KEY}=${variant} served but no exposure recorded: identity not enrolled in a running experiment in env=${process.env.FLAGSMITH_ENV_NAME ?? '(unset)'}`,
    );
  }
  return { variant, source: 'flagsmith', exposed };
}
