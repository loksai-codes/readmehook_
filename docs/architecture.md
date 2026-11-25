# Architecture

```mermaid
flowchart LR
  V[Visitor / Creator] -->|/r/owner/repo| N[Next.js App Router SSR]
  N --> C{Upstash Redis cache 15 min}
  C -- miss --> G[GitHub REST API]
  G --> C
  C --> P[Deterministic README parser]
  P --> F[Flagsmith: identify rh_vid + traits, experiment flag repo_hero_layout]
  F --> H[Hero variant render]
  H -->|copy / click / bounce| T[/api/track/]
  T --> FS[Flagsmith events]
  T --> R[Redis HINCRBY counters]
  R --> S[/stats + /insights/]
```

## Request flow for `/r/[owner]/[repo]`

1. `proxy.ts` (Next 16 name for middleware) ensures the `rh_vid` cookie for humans; bots get none. The page classifies the request (human / bot / prefetch) via `lib/identity`.
2. Server component loads `getRepoSnapshot(owner, repo)` (cache → GitHub).
3. `parseReadme(snapshot)` → `ParsedReadme` (pure).
4. If human: `evaluateHeroLayout(rh_vid, traits)` → variant (exposure recorded). If bot: control, no identify.
5. Render `HeroShell` + variant hero; client components attach trackers.
6. Client fires `card_view` on mount.

## Telemetry flow

Client `trackExperimentEvent` → `POST /api/track` (`sendBeacon` for unload/outbound) → validate → Flagsmith event (identity `rh_vid`) + Redis counters → Flagsmith flush awaited **before** the response (AWS Amplify/Lambda can freeze right after it; `after()` is unsupported there).

## Redis keys

| Key | Type | Purpose |
|---|---|---|
| `gh:{owner}/{repo}` | string JSON, 900 s | RepoSnapshot cache |
| `gh:stale:{owner}/{repo}` | string JSON, 24 h | stale fallback |
| `{p}repo:{owner}/{repo}:variant:{v}` | hash | `views, clones, outbound, intent, bounces` |
| `{p}repo:{owner}/{repo}:variant:{v}:uniq:{metric}` | set | visitor ids already counted |
| `{p}exp:variant:{v}` | hash | global totals |
| `{p}exp:lang:{lang}:variant:{v}` | hash | language breakdown |
| `{p}exp:langs` | set | languages with counters (for `/insights`) |
| `{p}rl:{rh_vid}` | string, 60 s | `/api/track` rate limit |
| `{p}rl:{vid}` | counter, 60 s | rate limit |

`{p}` = `TELEMETRY_PREFIX` (`""` prod, `sim:` simulation).

## Source of truth

Flagsmith's experiment results page is the source of truth for the verdict. Redis counters power per-repo creator pages and the live dashboard and are labelled "live counters".
