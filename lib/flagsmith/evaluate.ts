import 'server-only';
import { getFlagsmith } from './client';
import { CONTROL, FLAG_KEY, toHeroLayout, type HeroLayout, type HeroTraits } from './variants';

/**
 * FR-6.1 / FR-6.2: identify `rh_vid` with the hero traits and evaluate `repo_hero_layout` through
 * the experiment-flag API, which records the exposure in the same call. Call it only for real human
 * page views (never bots, OG or prefetch), and flush afterwards (./flush.ts).
 *
 * Fails open to CONTROL (CLAUDE.md rule 10, NFR-2). There is deliberately no extra timeout around
 * the call: the SDK's own request timeout throws before an exposure is recorded, whereas racing it
 * here could record an exposure for a variant the visitor never saw.
 */
export async function evaluateHeroLayout(visitorId: string, traits: HeroTraits): Promise<HeroLayout> {
  const flagsmith = getFlagsmith();
  if (!flagsmith) return CONTROL;
  try {
    const flag = await flagsmith.getExperimentFlag(FLAG_KEY, visitorId, { ...traits });
    if (!flag.enabled) return CONTROL;
    return toHeroLayout(flag.value);
  } catch (err) {
    console.error('[flagsmith] evaluation failed, serving control', err);
    return CONTROL;
  }
}
