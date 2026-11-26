# Results: hero layout, quickstart vs architecture

> **Draft.** Every `__` is blank on purpose and gets filled only from the Production Flagsmith results page (and, for the confound check, the Production `/insights` counters). Simulated or Development traffic never goes here. No number on this page is estimated.

Experiment: **Hero layout: quickstart vs architecture** · Flagsmith experiment 485 · Production
Ran: 2026-11-25 17:25 UTC (started in Flagsmith) → __ UTC · **Data from: 2026-11-26 04:29 UTC** · Results refreshed at: __ UTC

> **Data window.** Until 2026-11-26 04:29 UTC the Production `FLAGSMITH_SERVER_KEY` on Vercel was invalid. Every visitor was served control through the fallback path and Flagsmith recorded no exposures and no events (Production identities: 0, API requests: 0, warehouse events: 0). The key was re-entered, and since the 04:33 UTC deploy every visit's variant source is logged and recorded in Redis (`assign_flagsmith` / `assign_fallback`). The first two exposures (04:29 and 04:34 UTC) were our own verification visits. Redis visits from before the fix are not used anywhere on this page.

## 1. Hypothesis

Written before any data, with the sample-size estimate and the decision rule: [`docs/experiment-plan.md`](experiment-plan.md).

> If a visitor sees a copyable quickstart command above the fold (`quickstart_first`) instead of an architecture diagram (`architecture_first`), they are more likely to show developer intent (copy the clone command or click through to GitHub). We expect a higher Developer Intent Rate with no increase in sub-5-second bounces.

What would prove it wrong: `quickstart_first` is not ahead on `developer_intent` per Flagsmith's win probability, **or** it is ahead only through its extra copy button (see §5), **or** the bounce guardrail gets worse.

| | |
|---|---|
| Flag | `repo_hero_layout` (multivariate) |
| Arms | control `architecture_first` 50% · `quickstart_first` 50% · `demo_gif_first` 0% |
| Unit | anonymous visitor (`rh_vid` cookie), sticky across repos and refreshes |
| Primary metric | `developer_intent` (expected to increase) |
| Secondary | `clone_command_copied`, `github_outbound_click` |
| Guardrail | `bounce_under_5s` (should not increase) |

## 2. Sample size (n per arm)

| | architecture_first (control) | quickstart_first |
|---|---|---|
| Visitors exposed (Flagsmith) | __ | __ |

The plan needs about 140–250 visitors per arm to detect a +10–15 point lift from a 10–20% baseline, and about 700 per arm for +5 points. With n = __ per arm, this test can only detect a lift of roughly __ points or more.

Traffic source: __ (e.g. the Toggle Wars Discord, with `?ref=discord`). A developer audience, but a narrow one.

## 3. Flagsmith results (source of truth)

| | architecture_first (control) | quickstart_first |
|---|---|---|
| Developer intent | __ (__%) | __ (__%) |
| Clone command copied | __ (__%) | __ (__%) |
| GitHub outbound click | __ (__%) | __ (__%) |
| Bounce under 5 s (guardrail) | __ (__%) | __ (__%) |

**Win probability for the primary metric (quoted from Flagsmith):** __
**Credible interval / lift vs control (as shown):** __

<!-- Screenshot: docs/screenshots/flagsmith-results.png (Flagsmith experiment 485 results page) -->
_Screenshot placeholder: `docs/screenshots/flagsmith-results.png`, not captured yet._

## 4. Clone-box-only check

The clone box and the GitHub button are identical in both arms. Comparing them per arm separates the layout effect from the extra button. Source: Production `/insights` → "Confound check" (Redis live counters, unique visitors, counted from 2026-11-26 04:33 UTC when source tracking shipped, so n here is smaller than §2).

| | architecture_first (control) | quickstart_first |
|---|---|---|
| Visitors since source tracking (n) | __ | __ |
| Clone box copy | __ (__%) | __ (__%) |
| Quickstart copy (treatment only) | n/a | __ (__%) |
| GitHub button | __ (__%) | __ (__%) |

These are live counters, not a significance test. Read: __

## 5. Disclosed confound

- **The treatment has an extra copy button.** `quickstart_first` puts a copyable quickstart command in the hero. The control's hero (a diagram) has no copy button. Both arms share the same clone box and GitHub button. So the treatment has more ways to fire `clone_command_copied`, and with it `developer_intent`.
- **A quickstart copy counts as a clone copy.** Copying the quickstart command (for example `pnpm install`) fires `clone_command_copied` in Flagsmith, even though it is not the clone command.
- **What we did:** the running experiment and its metrics were not changed. Since __ UTC, each copy/click also records which button it came from in Redis only (§4). If `quickstart_first` wins in Flagsmith but not on clone-box and GitHub-button rates, the win is attributed to the extra button, not the layout.

## 6. Decision (per the rule in [`experiment-plan.md`](experiment-plan.md#decision-rule))

| Outcome | Decision |
|---|---|
| quickstart_first ahead on intent, Flagsmith indicates it's likely better, guardrail OK | Make `quickstart_first` the default; recommend it in `/stats` advice |
| Ahead but guardrail breached | Don't ship; investigate (media size? layout shift?) |
| No clear difference | Report the null result + n + what we'd need to detect a smaller effect |

Our outcome: __
Why (win probability, guardrail, confound check): __

## 7. Rollout via the same flag

The winner ships through `repo_hero_layout`; no code change and no new flag.

| | |
|---|---|
| Experiment ended | __ UTC |
| Change made in Flagsmith | __ (e.g. control value of `repo_hero_layout` set to `__`, or kept at `architecture_first`) |
| Environment | Production |
| Verified on the live card | __ |

## What surprised us

__

## What we'd test next

- `demo_gif_first` for `visual_heavy_repos` (repos whose README has a demo GIF/video), via the segment override described on `/insights` (admin drawer).
- __
