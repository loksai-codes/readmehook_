# CLAUDE.md — ReadmeHook

Guidance for Claude Code working in this repository. Read this first, then `PRD.md` and `requirements.md`.

## What this is

ReadmeHook turns a public GitHub repo into a shareable landing card (`/r/owner/repo`) and runs a **Flagsmith Experimentation A/B test** on the above-the-fold hero layout (`repo_hero_layout`). Built for the Toggle Wars hackathon, Track 01 "Test Something Real". The experiment is the product: correctness of exposures and events matters more than polish.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · `next/og` · `@flagsmith/nodejs` (server evaluation + events; the SDK moved from the old `flagsmith-nodejs` package, which stops at 8.x, to `@flagsmith/nodejs` for 9.x) · `@upstash/redis` · `mermaid` (client only) · `shiki` · Vitest · pnpm · Vercel.

## Commands

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test   # must pass before every commit (typecheck runs `next typegen` first)
pnpm simulate            # scripts/simulate-traffic.ts → DEV environment only
```

## Repository map

```
app/                      routes (see app/README.md)
  page.tsx                URL input
  r/[owner]/[repo]/       card page + stats/
  insights/               public dashboard (Phase 2)
  api/track/route.ts      telemetry ingest (dual-write)
  api/og/[owner]/[repo]/  OG image
components/hero/          the 3 variant heroes + shared shell
components/telemetry/     client trackers (copy, outbound, bounce guardrail)
lib/github/               REST client + cached snapshot
lib/parser/               PURE deterministic README parsing (unit-tested)
lib/flagsmith/            server SDK singleton, evaluateHeroLayout(), trackFlagsmithEvent()
lib/telemetry/            event names, trackExperimentEvent (client), recordEvent (server)
lib/redis/                Upstash client + key builders
lib/identity/             visitor id cookie, bot detection, referrer_source
lib/advice/               Stage 1 audit + Stage 2 verdict + Markdown export
scripts/                  simulate-traffic.ts, smoke tests
docs/                     flagsmith-setup.md, experiment-plan.md, architecture.md, demo-script.md
tests/                    vitest specs + README fixtures
```

## Non-negotiable rules

1. **Event names are a contract.** Define them once in `lib/telemetry/events.ts`:
   `card_view`, `clone_command_copied`, `github_outbound_click`, `developer_intent`, `bounce_under_5s`. They must match the Flagsmith metric event names exactly (case-sensitive). Never inline string literals elsewhere.
2. **Flag values are a contract.** `lib/flagsmith/variants.ts` exports `HERO_LAYOUTS = ['architecture_first','quickstart_first','demo_gif_first'] as const` and `CONTROL = 'architecture_first'`. Unknown value → control.
3. **Identify before evaluating.** Exposure is recorded when the experiment flag is requested for an identity. Always evaluate with the `rh_vid` identity + traits, using the SDK's experiment-flag API, and only for real human page views (skip bots, OG, prefetch).
4. **Same identifier everywhere.** The `rh_vid` cookie is the Flagsmith identity, the telemetry identity, and the Redis uniqueness key. `/api/track` reads it from the cookie, never from the request body.
5. **Flush events on serverless.** The app deploys to Vercel. The SDK's flush timer is off (`flushInterval: 0`); every request that records an exposure or event calls `after(flushFlagsmith)` (`next/server`; Vercel keeps the function alive via `waitUntil` until it settles, capped at 5 s in `lib/flagsmith/flush.ts`). Missing flushes = missing exposures.
6. **Server decides the variant.** Evaluate in the server component, pass `variant` as a prop. No client re-evaluation, no layout flicker.
7. **Variants differ only in the hero block.** Shared shell (name, stars, clone box, GitHub CTA) is identical, so the test is fair.
8. **Parser is pure.** No fetch, no Date, no randomness in `lib/parser/`. Every new rule gets a test with a fixture in `tests/fixtures/`.
9. **No LLM calls, no OAuth, no accounts.** Hard scope cuts.
10. **Fail open to control.** Flagsmith/Redis/GitHub errors must never 500 the card page.
11. **Secrets.** Never commit `.env*` (except `.env.example`) or `flagsmith.env`. Never expose the server key client-side.
12. **Simulated traffic never touches Production.** `scripts/simulate-traffic.ts` refuses to run unless `FLAGSMITH_ENV_NAME !== 'production'` and uses `TELEMETRY_PREFIX=sim:`.

## Conventions

- Server-only modules start with `import 'server-only'`.
- Redis keys only via builders in `lib/redis/keys.ts`.
- Tailwind for styling; no component library needed. Dark theme, monospace for commands.
- Small commits referencing requirement IDs, e.g. `feat(parser): FR-3.2 extract quickstart`.
- If the Flagsmith SDK method names differ from what's written here, follow the current Flagsmith docs (https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent) and update this file.

## Build phases

Work through `prompt.md` milestones in order. Phase 1 (2-arm experiment, 50/50) ships before any Phase 2 work. Check items off in `requirements.md` §4 as they pass.

- Never add Co-Authored-By or Claude attribution to commits.
