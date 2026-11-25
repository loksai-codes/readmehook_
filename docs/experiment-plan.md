# Experiment plan — repo_hero_layout

Write this down **before** looking at data. It's what judges read.

## Hypothesis (paste into Flagsmith)

> If a visitor sees a copyable quickstart command above the fold (`quickstart_first`) instead of an architecture diagram (`architecture_first`), they are more likely to show developer intent (copy the clone command or click through to GitHub), because the first question a developer asks in 5 seconds is "can I run this?". We expect a higher Developer Intent Rate with no increase in sub-5-second bounces.

## Design

- Unit: anonymous visitor (`rh_vid`), sticky across repos and refreshes.
- Arms: control `architecture_first` vs `quickstart_first`, 50/50.
- Primary metric: `developer_intent` (once per visitor per repo).
- Secondary: `clone_command_copied`, `github_outbound_click`.
- Guardrail: `bounce_under_5s` — must not be worse than control by more than ~5 pp.
- Population: real visitors to `/r/*` in Production. Bots excluded. Simulated traffic only in Development.
- Duration: from deploy (Day 2) to Day 4 noon, or earlier if the Flagsmith results page shows a clear winner and ≥ 100 visitors per arm.

## Sample-size reality check

Approximate visitors per arm for 80% power, α = 0.05, two-sided:

| Baseline intent | Detect lift to | ≈ per arm |
|---|---|---|
| 10% | 20% | ~200 |
| 15% | 25% | ~250 |
| 20% | 35% | ~140 |
| 10% | 15% | ~700 |

Three arms need roughly 1.5× the total traffic. That's why Phase 1 is two arms.

## Decision rule

| Outcome | Decision |
|---|---|
| quickstart_first ahead on intent, Flagsmith indicates it's likely better, guardrail OK | Make `quickstart_first` the default; recommend it in `/stats` advice |
| Ahead but guardrail breached | Don't ship; investigate (media size? layout shift?) |
| No clear difference | Report the null result + n + what we'd need to detect a smaller effect |

## Results template (`docs/results.md`)

```
Experiment: Hero layout: quickstart vs architecture
Ran: <start> → <end> (Production)
Visitors: control n=__, quickstart_first n=__
Developer Intent Rate: control __% vs quickstart_first __% (Flagsmith: <probability/significance shown>)
Guardrail bounce_under_5s: control __% vs __%
Segment insight (optional): by repo_language / referrer_source …
Decision: …
What surprised us: …
What we'd test next: demo_gif_first for visual_heavy_repos
```
