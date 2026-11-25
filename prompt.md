# Kickoff prompt for Claude Code

How to use: create an empty folder, copy this starter kit into it, run `git init`, open Claude Code in that folder, and paste **Prompt 1**. Paste the later prompts one at a time when the previous milestone is green. Before Prompt 3, do the Flagsmith dashboard/CLI setup in `docs/flagsmith-setup.md` (or let Prompt 3 drive it with the official coding-agent prompt).

---

## Prompt 1 — Foundation (Day 1 morning)

```
You are building ReadmeHook for the Flagsmith "Toggle Wars" hackathon (Track 01: Test Something Real).

Read these files fully before writing code: CLAUDE.md, PRD.md, requirements.md, docs/architecture.md, docs/experiment-plan.md. CLAUDE.md's rules are non-negotiable.

Milestone 1 — foundation:
1. Scaffold a Next.js App Router app with TypeScript strict, Tailwind, ESLint, Vitest and pnpm IN THIS FOLDER, keeping the existing docs and folder structure. create-next-app refuses non-empty folders, so scaffold into a temp dir and merge the generated files in (don't overwrite PRD.md, requirements.md, CLAUDE.md, prompt.md, docs/, lib/**/*.ts, .gitignore, .env.example). Use a root-level app/ (no src/). Keep the placeholder README.md files in code folders until you add real code there.
2. Add dependencies: flagsmith-nodejs (>= 9.1.0), @upstash/redis, mermaid, shiki, zod, uuid, server-only.
3. Implement lib/redis (client + keys.ts), lib/github (FR-2, with 15-min cache + stale fallback), and lib/parser (FR-3) as pure functions.
4. Write Vitest tests for the parser using fixtures in tests/fixtures/ (create 6+ realistic README fixtures: mermaid present, untagged quickstart, relative GIF, empty README, Python repo, Rust repo).
5. Implement / with the URL input (FR-1) and a temporary /r/[owner]/[repo] page that dumps the parsed snapshot as JSON.
6. Create .env.example from requirements.md §3 (no real values).

Stop when `pnpm lint && pnpm typecheck && pnpm test` pass and /r/vercel/next.js renders. Show me the test output and a summary of files created. Commit with message referencing FR ids.
```

## Prompt 2 — Hero variants (Day 1 afternoon)

```
Milestone 2 — hero variants (FR-4, FR-5).
1. Build components/hero/HeroShell plus ArchitectureFirstHero, QuickstartFirstHero, DemoGifFirstHero. Only the hero block differs between variants (CLAUDE.md rule 7).
2. Mermaid renders client-side in an error boundary with a code-block fallback; shiki highlights commands server-side; media lazy-loads.
3. Add middleware for the rh_vid cookie and bot detection (lib/identity), plus referrer_source (FR-6.5).
4. Temporarily allow ?variant= to force a layout in development only (NODE_ENV !== 'production') so I can review all three.
Show me screenshots-worthy pages for 3 real repos (one with mermaid, one with a GIF, one with neither). Run checks and commit.
```

## Prompt 3 — Flagsmith experiment wiring (Day 1 evening)

```
Milestone 3 — Flagsmith Experimentation (FR-6, FR-7).
First, read https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent and follow its setup flow for THIS app, using these decisions (already made — don't re-ask them):
- What we test: multivariate flag `repo_hero_layout`, control value `architecture_first`, variation key/value `quickstart_first` (Phase 1, 50/50). Create `demo_gif_first` as a variation too but give it 0% allocation for now.
- Success: metric `Developer intent`, aggregation occurrence, direction up, event `developer_intent`. Also create metrics for `clone_command_copied`, `github_outbound_click`, and a guardrail metric for `bounce_under_5s` (direction down) if the experiment supports multiple metrics.
- Hypothesis text: from docs/experiment-plan.md.
- Identity: the rh_vid cookie.
- Environments: Development for testing/simulation, Production for the real experiment.
Never commit flagsmith.env or any admin key.

Then implement:
1. lib/flagsmith: server singleton with events enabled; evaluateHeroLayout(visitorId, traits) using the experiment-flag API so exposures are recorded; trackFlagsmithEvent(visitorId, event); flush handling suitable for Vercel serverless.
2. Wire evaluation into /r/[owner]/[repo]/page.tsx (server), pass variant to the client. Fail open to control.
3. lib/telemetry/events.ts (event-name contract), client trackExperimentEvent, components/telemetry (CopyCommandButton, GitHubCta with sendBeacon, BounceGuardrail per FR-7.4, DeveloperIntent once-per-visitor logic).
4. app/api/track/route.ts: allow-list, cookie identity, rate limit, dual-write to Flagsmith + Redis HINCRBY/SADD (FR-7.3).
5. Do NOT start the experiment yet. Show me the plan for code changes first, then implement after I approve.
Verify end to end in Development: two browsers, different variants, events visible in Flagsmith. Run checks and commit.
```

## Prompt 4 — Stats, OG, share, deploy (Day 2)

```
Milestone 4 — FR-8.1, FR-8.2, FR-9.
1. lib/advice: Stage 1 audit + optimized README hero Markdown export (pure, tested).
2. /r/[owner]/[repo]/stats page with audit cards and copy buttons.
3. /api/og/[owner]/[repo] with next/og, plus metadata (og:image, twitter card) on the card page.
4. Share panel on the card creator flow with the Discord prompt and ?ref=discord link.
5. Prepare for Vercel: list env vars I must set, and a checklist from requirements.md §4. Remove the dev-only ?variant= override from production builds.
Run checks and commit. Then tell me exactly what to click to start the experiment in Production.
```

## Prompt 5 — Phase 2 (Day 3, only if Phase 1 is live and collecting traffic)

```
Milestone 5 — FR-8.3 Stage 2 verdict and FR-10 /insights dashboard.
Read counters from Redis (prod prefix), show n per arm, intent rate, bounce rate, guardrail chips, language breakdown, and a prominent link to the Flagsmith results page as source of truth. Add the ADMIN_TOKEN-gated drawer explaining the visual_heavy_repos segment override (has_demo_video == true → demo_gif_first). Keep charts simple (inline SVG bars). Run checks and commit.
```

## Prompt 6 — Simulation & write-up (Day 3–4)

```
1. Finish scripts/simulate-traffic.ts per scripts/README.md (Development environment + sim: prefix only; refuse otherwise).
2. Draft docs/results.md from the template in docs/experiment-plan.md using the real Production numbers I paste in. Be honest about sample size; don't claim significance the Flagsmith results page doesn't show.
3. Update README.md for judges: what, why, hypothesis, setup, results, screenshots placeholders, how to run.
```
