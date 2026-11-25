# ReadmeHook — Product Requirements Document (PRD)

> **What makes a developer actually clone a GitHub repo?**
> Toggle Wars: The Flagsmith Experimentation Hackathon (WeMakeDevs, Nov 26–30, 2026) · Track 01 "Test Something Real"
> Source of truth: `docs/spec/readmehook-v2.md` (the upgraded v2 spec). Where this PRD and the spec differ, this PRD's **Phase 1 scope** wins for build order, and the spec wins for the full vision.

---

## 1. Problem

Developers decide whether to star, clone or abandon a repo within ~5 seconds of landing on it. Hackathon READMEs routinely fail that window: walls of text, buried value propositions, broken badges, quickstarts that don't run. Builders spend hours on code and lose visitors to an above-the-fold layout that never hooks intent.

## 2. Product

**ReadmeHook**: paste any public GitHub repo URL (`github.com/owner/repo`) and get a shareable, interactive landing card at `/r/owner/repo`, with:

- Dynamic Open Graph image for Discord/Twitter unfurls.
- An instant README audit plus 1-click "Copy optimized README hero" Markdown.
- A live, Flagsmith-powered A/B test of **which above-the-fold hero layout converts visitors** into copying the clone command or clicking through to GitHub.

### Two actors (no login anywhere)

| Actor | What they do | Identity |
|---|---|---|
| **Repo creator** | Pastes a URL, gets a link, shares it, reads `/r/owner/repo/stats` | None needed |
| **Repo visitor** | Lands on `/r/owner/repo`, sees one hero variant, maybe converts | Anonymous `visitor_id` (UUID) in an HTTP-only cookie (+ localStorage mirror), passed to Flagsmith `identify` so the variant is sticky |

## 3. The experiment (the heart of the submission)

Judges reward **one experiment done well**: clear hypothesis, variants behind a multivariate flag, a metric from real events, results you can explain.

### Hypothesis (Phase 1)

> Showing a copyable **quickstart command above the fold** (`quickstart_first`) will raise the **Developer Intent Rate** versus an **architecture-diagram-first** hero (`architecture_first`, control), **without** increasing the `bounce_under_5s` rate.

Why: a visitor's first question is "can I run this in 30 seconds?". A runnable command answers it; a diagram answers "how does it work?", which is a second-visit question.

### Flag

- Key: `repo_hero_layout` (multivariate, string values)
- Control: `architecture_first`
- Variations (each **must have a key**, or Flagsmith records no exposures):
  - Phase 1: `quickstart_first` — **50 / 50** split with control
  - Full vision: + `demo_gif_first` → 34 / 33 / 33

### Metrics

| Role | Event | Definition |
|---|---|---|
| **Primary (Flagsmith metric)** | `developer_intent` | Fired **once per visitor per repo** on the first of `clone_command_copied` OR `github_outbound_click`. Makes the spec's composite KPI a single trackable event so Flagsmith can compute it natively. |
| Secondary | `clone_command_copied` | Copy button on the clone/quickstart block clicked |
| Secondary | `github_outbound_click` | "View on GitHub / Star" CTA clicked |
| **Guardrail** | `bounce_under_5s` | Visitor leaves (<5,000 ms from mount, via `visibilitychange`/`pagehide`) without any primary conversion |

**Developer Intent Rate** = unique visitors with `clone_command_copied` OR `github_outbound_click` ÷ unique card views.

### Decision rule (write it down before data arrives)

- Ship `quickstart_first` as the default if Flagsmith shows it ahead on `developer_intent` with the results page's significance/probability indicator favouring it **and** its `bounce_under_5s` rate is not worse than control by more than ~5 percentage points.
- Otherwise: report "no detectable difference at n = X" honestly. A clean null result explained well still scores.

### Why two variants first (statistical power)

Real hackathon traffic is small. With a baseline intent rate around 10–15%, detecting a doubling needs very roughly 150–250 visitors **per arm**. Three arms need ~50% more total traffic for the same power. So Phase 1 runs a 2-arm test; `demo_gif_first` is built as a feature but only enters the experiment if traffic allows (or as the Segment-override demo).

## 4. Scope

### Phase 1 — must ship (recommended build order)

1. URL input on `/` → redirect to `/r/owner/repo`.
2. GitHub ingestion (repo metadata, README, top-level contents) with 15-min Upstash Redis cache.
3. Deterministic README parser (mermaid blocks, first shell block, first media URL, manifests) + fallbacks.
4. Hero variants `architecture_first` and `quickstart_first` (+ `demo_gif_first` component).
5. Visitor identity + Flagsmith experiment flag evaluation with traits.
6. Telemetry: `clone_command_copied`, `github_outbound_click`, `developer_intent`, `bounce_under_5s` → Flagsmith **and** Redis counters.
7. `/r/owner/repo/stats`: Stage 1 static audit + "Copy optimized README hero".
8. Dynamic OG image (`/api/og/owner/repo`).
9. Deploy to Vercel, seed Discord, collect real traffic.

### Phase 2 — should ship if time allows

- Stage 2 live verdict on `/stats` (n ≥ 10 views per repo).
- `/insights` public dashboard (per-variant rates, by `repo_language`, n counters, guardrail status).
- Third arm `demo_gif_first` in the experiment.
- Segment `visual_heavy_repos` (`has_demo_video == true`) → override to `demo_gif_first`, shown in the `/insights` admin drawer for the video.

### Out of scope (hard cuts)

- No GitHub OAuth / login / accounts.
- No blocking LLM calls. All parsing is deterministic and sub-second.
- No private repos. No database beyond Upstash Redis.

## 5. Traits passed at evaluation

`repo_language` (string), `has_demo_video` (bool), `has_mermaid_diagram` (bool), `referrer_source` (`discord` | `twitter` | `direct` | other; from `?ref=` then `Referer`). Also `repo_slug` (string) for debugging.

## 6. Hero variants & fallbacks

| Variant | Primary extraction | Fallback |
|---|---|---|
| `architecture_first` | First ```` ```mermaid ```` block, or section titled `## Architecture` / `## How it works` | Auto 3-node Mermaid flowchart: `Input/Client → <repo> [<language>] → Output/API`, labels from topics + manifests |
| `quickstart_first` | First `bash`/`sh`/`shell`/`console` block containing `npx`, `docker`, `npm`, `pnpm`, `yarn`, `pip`, `cargo`, `go`, or `git clone` | `git clone https://github.com/owner/repo.git && cd repo` + language-matched install line |
| `demo_gif_first` | First `.gif` / `.mp4` / `.webm` / GitHub user-attachments asset URL | Stylised browser frame of `homepage`, or animated terminal mockup of the quickstart |

Every variant shows the same chrome: repo name, description, stars, language badge, the clone command copy box, and the GitHub CTA. **Only the above-the-fold hero block differs.** That's what keeps the test fair.

## 7. Creator Advice Engine (`/r/owner/repo/stats`)

- **Stage 1 (n = 0, instant):** missing-quickstart (no copyable command in top 30 lines), missing-architecture (no mermaid), missing-demo-media checks; each with a ready snippet. Plus "Copy optimized README hero" Markdown export.
- **Stage 2 (n ≥ 10):** per-variant Developer Intent Rate for this repo + guardrail diagnostics, phrased as advice ("quickstart_first converts at 28% vs 11% — move your install command above the fold"). Always show n and a "low sample" warning below 30 per arm.

## 8. Distribution

- OG image: repo name, stars, language badge, a hero snippet, "Would you clone this?" callout.
- One-click Discord share prompt after link generation:
  > Hey everyone! Built a tool for Toggle Wars. Not sure if my README makes sense in 5 seconds — test my ReadmeHook link and tell me if you'd clone it: https://<domain>/r/owner/repo?ref=discord
  (Avoid `@everyone` pings; most servers block them and it annoys people.)

## 9. Success criteria for the submission

- Experiment `running` in Flagsmith with exposures from real visitors, and results you can screenshot.
- A one-paragraph write-up: hypothesis → setup → n per arm → result → guardrail → decision.
- 2–3 minute demo video: paste URL → card → switch variants (different visitor) → copy command → Flagsmith results → `/stats` advice.

## 10. Timeline

| Day | Goal |
|---|---|
| Day 1 (Nov 26) | Scaffold, GitHub ingestion + cache, parser, hero variants, Flagsmith flag/metric/experiment, evaluation wired |
| Day 2 (Nov 27) | Telemetry (dual-write), guardrail, OG image, `/stats` Stage 1, deploy to Vercel, **start experiment** |
| Day 3 (Nov 28) | Discord seeding, real traffic, `/insights`, Stage 2 verdict, segment override |
| Day 4 (Nov 29–30) | Read results, write-up, demo video, submit before the deadline (confirm the exact cutoff on the hackathon page) |

Start the experiment as early as possible: every hour it runs is sample size.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Too little traffic | 2 arms; seed Discord early; `?ref=` tracking; ask builders to share their own cards |
| GitHub rate limit | PAT (5,000 req/h) + 15-min Redis cache; serve stale on error |
| Mermaid render crashes | Error boundary + static fallback; render client-side only |
| Heavy GIFs stall load (skews guardrail) | Lazy-load media, poster frame, size cap |
| Exposures not recorded | Variation keys set; identify **before** requesting the flag; flush events |
| Simulated traffic contaminates results | Simulation only in a separate `Development` environment; never in `Production` |
