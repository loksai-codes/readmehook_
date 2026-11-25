# Results: hero layout, quickstart vs architecture

> **Draft.** The setup below is filled in. Every number marked `__` is still blank and waits for the real Production figures from the Flagsmith results page. Simulated or Development traffic is never used here.

```
Experiment: Hero layout: quickstart vs architecture (Flagsmith experiment 485, Production)
Ran: 2026-11-25 17:25 UTC → __ (Production)
Visitors: control (architecture_first) n=__, quickstart_first n=__
Developer Intent Rate: control __% vs quickstart_first __% (Flagsmith: __)
Guardrail bounce_under_5s: control __% vs quickstart_first __%
Segment insight (optional): by repo_language / referrer_source …
Decision: __
What surprised us: __
What we'd test next: demo_gif_first for visual_heavy_repos
```

## Setup

| | |
|---|---|
| Flag | `repo_hero_layout` (multivariate) |
| Arms | control `architecture_first` 50% · `quickstart_first` 50% · `demo_gif_first` 0% (Phase 1 is two arms) |
| Unit | anonymous visitor (`rh_vid` cookie), sticky across repos and refreshes |
| Exposure | recorded server-side when the experiment flag is evaluated for a human page view; bots, link unfurlers, prefetches and the creator's own first view are never identified |
| Primary metric | Developer intent (`developer_intent`, occurrence, expected to increase) |
| Secondary | Clone command copied, GitHub outbound click |
| Guardrail | Fast bounce (`bounce_under_5s`, should not increase) |
| Population | real visitors to `/r/*` on the Production deploy |
| Hypothesis | see `docs/experiment-plan.md` |

## Numbers (from the Flagsmith results page)

| | architecture_first (control) | quickstart_first |
|---|---|---|
| Visitors exposed (n) | __ | __ |
| Developer intent | __ (__%) | __ (__%) |
| Clone command copied | __ (__%) | __ (__%) |
| GitHub outbound click | __ (__%) | __ (__%) |
| Bounce under 5 s (guardrail) | __ (__%) | __ (__%) |

What Flagsmith shows for the primary metric, quoted as shown (e.g. its probability or significance indicator, and the interval if one is given): __

Results refreshed at: __ UTC. Screenshot: `docs/screenshots/flagsmith-results.png`

## How to read this honestly

- **Sample size.** `docs/experiment-plan.md` estimates about 140–250 visitors per arm to detect a jump from a 10–20% baseline to +10–15 points with 80% power, and about 700 per arm for a +5 point lift. With n = __ per arm, this test can only detect an effect of roughly __ points or more.
- **Significance.** This write-up claims only what the Flagsmith results page shows. If Flagsmith shows no clear winner, the result is reported as inconclusive, not as "quickstart_first looks better".
- **Live counters.** The `/insights` page shows Redis live counters (unique visitors per metric). They are useful for watching the test run, but they are not the analysis, and they can differ slightly from Flagsmith (Flagsmith only counts conversions after an identity's first exposure).
- **Who the visitors were.** Traffic came mostly from __ (e.g. the Toggle Wars Discord). That is a developer audience, but a narrow one, so the result may not carry over to visitors arriving from search.

## Decision (per the rule in docs/experiment-plan.md)

| Outcome | Decision |
|---|---|
| quickstart_first ahead on intent, Flagsmith indicates it's likely better, guardrail OK | Make `quickstart_first` the default; recommend it in `/stats` advice |
| Ahead but guardrail breached | Don't ship; investigate (media size? layout shift?) |
| No clear difference | Report the null result + n + what we'd need to detect a smaller effect |

Our outcome: __

## Segment insight (optional)

By `repo_language` or `referrer_source`, only if each segment has enough visitors to say anything (otherwise state that the segments were too small): __

## What surprised us

__

## What we'd test next

- `demo_gif_first` for `visual_heavy_repos` (repos whose README has a demo GIF/video), via the segment override described on `/insights` (admin drawer).
- __
