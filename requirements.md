# ReadmeHook — Requirements

IDs are referenced from `prompt.md`, `CLAUDE.md` and commit messages. **P1** = Phase 1 (must), **P2** = Phase 2 (should).

## 1. Functional requirements

### FR-1 Repo input & routing (P1)
- FR-1.1 `/` shows a single input accepting `https://github.com/owner/repo`, `github.com/owner/repo`, or `owner/repo` (trailing `.git`, `/tree/...`, query strings stripped).
- FR-1.2 Invalid input shows an inline error; valid input navigates to `/r/{owner}/{repo}`.
- FR-1.3 After generation, show the share link, a copy button, and the Discord share prompt (FR-9.2).
- FR-1.4 `owner` and `repo` are validated against `^[A-Za-z0-9-_.]{1,100}$` before any API call.

### FR-2 GitHub ingestion (P1)
- FR-2.1 `GET /repos/{owner}/{repo}` → `description, stargazers_count, language, topics, default_branch, homepage, html_url, owner.avatar_url`.
- FR-2.2 `GET /repos/{owner}/{repo}/readme` → base64-decode to UTF-8 Markdown.
- FR-2.3 `GET /repos/{owner}/{repo}/contents/` → detect `package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, Dockerfile, docker-compose.yml`.
- FR-2.4 Authenticate with `GITHUB_TOKEN` (fine-grained PAT, public read-only).
- FR-2.5 Cache the combined `RepoSnapshot` in Redis at `gh:{owner}/{repo}` for 900 s. On GitHub error, serve stale cache if present (store a second key with 24 h TTL).
- FR-2.6 404 / private repo → friendly "repo not found or private" page; 403 rate-limit → "try again in a minute" page.

### FR-3 Deterministic README parser (P1)
Pure functions in `lib/parser/`, no network, unit-tested.
- FR-3.1 `extractMermaid(md)` → first ```` ```mermaid ```` block, else the body of a `## Architecture` / `## How it works` section (as text).
- FR-3.2 `extractQuickstart(md)` → first fenced block tagged `bash|sh|shell|console|zsh` (or untagged) containing `npx|npm|pnpm|yarn|docker|pip|uv|cargo|go (run|install)|git clone`, within the whole README; also record whether it was in the top 30 lines (for the audit).
- FR-3.3 `extractMedia(md)` → first `.gif|.mp4|.webm|.mov` URL or `github.com/user-attachments/assets/...` URL; resolve relative paths to `raw.githubusercontent.com/{owner}/{repo}/{branch}/...`.
- FR-3.4 `synthesizeQuickstart(snapshot)` → `git clone https://github.com/{owner}/{repo}.git && cd {repo}` + one install line by manifest: npm → `npm install && npm run dev`; Python → `pip install -r requirements.txt`; Go → `go run .`; Rust → `cargo run`; Docker → `docker compose up`.
- FR-3.5 `synthesizeMermaid(snapshot)` → 3-node `flowchart LR` (`Input/Client --> {repo} [{language}] --> Output/API`), labels sanitized for Mermaid.
- FR-3.6 Output a `ParsedReadme` with `hasMermaid`, `hasDemoMedia`, `hasQuickstart`, `quickstartInTop30` flags and `source: "extracted" | "synthesized"` on each asset.
- FR-3.7 Parsing a 200 KB README completes in < 50 ms.

### FR-4 Hero variants (P1)
- FR-4.1 Components `ArchitectureFirstHero`, `QuickstartFirstHero`, `DemoGifFirstHero` in `components/hero/`.
- FR-4.2 Shared shell identical across variants: name, description, stars, language badge, clone copy box, GitHub CTA. Only the hero block differs.
- FR-4.3 Mermaid renders client-side inside an error boundary; on failure show the code as a highlighted block.
- FR-4.4 Code blocks use `shiki` (server-side highlighting).
- FR-4.5 Media lazy-loads with a size cap; videos are `muted autoplay loop playsinline`.
- FR-4.6 Unknown/missing flag value → render control (`architecture_first`).

### FR-5 Visitor identity (P1)
- FR-5.1 Middleware sets `rh_vid` (UUID v4) HTTP-only, `SameSite=Lax`, 1-year cookie if absent.
- FR-5.2 The same id is used for flag evaluation, every telemetry event, and Redis uniqueness sets.
- FR-5.3 Bots (user-agent matches common crawler list incl. Discordbot, Twitterbot, Slackbot) get the control layout and are **not** identified or tracked.

### FR-6 Flagsmith evaluation (P1)
- FR-6.1 Server-side: `flagsmith-nodejs` evaluates `repo_hero_layout` for identity `rh_vid` with traits `repo_language, has_demo_video, has_mermaid_diagram, referrer_source, repo_slug`, using the SDK's **experiment** flag path so an exposure is recorded.
- FR-6.2 Evaluate **after** identifying, and only on a real page view (not OG/prefetch).
- FR-6.3 SDK versions meet Flagsmith's Experimentation minimums (Node.js ≥ 9.1.0; JS/React ≥ 12.4.0) with events enabled; flush/close as the SDK requires on serverless.
- FR-6.4 The resolved variant is passed to the client as a prop (no client-side re-evaluation → no flicker).
- FR-6.5 `referrer_source`: `?ref=` wins; else map `Referer` host (discord.com/discordapp → `discord`, t.co/x.com/twitter → `twitter`, none → `direct`, else `other`).

### FR-7 Telemetry (P1)
- FR-7.1 Client helper `trackExperimentEvent(name, { repoSlug, variant })` POSTs to `/api/track`.
- FR-7.2 Events: `card_view` (on mount), `clone_command_copied`, `github_outbound_click`, `developer_intent` (once per visitor+repo, first conversion), `bounce_under_5s`.
- FR-7.3 `/api/track` validates event name against an allow-list, reads `rh_vid` from the cookie (never from the body), then dual-writes:
  - Flagsmith: tracks the event for identity `rh_vid` (event names **exactly** match the Flagsmith metric's event, case-sensitive).
  - Redis: `HINCRBY repo:{owner}/{repo}:variant:{v} {metric} 1` and global `exp:variant:{v}`; uniqueness via `SADD` sets `…:uniq:{metric}`, counters only incremented when `SADD` returns 1.
- FR-7.4 Guardrail: start `performance.now()` at mount; on `visibilitychange→hidden` or `pagehide`, if < 5000 ms and no conversion fired, send `bounce_under_5s` via `navigator.sendBeacon`. Fire at most once.
- FR-7.5 Outbound click uses `sendBeacon` before navigating so it is not lost.
- FR-7.6 `/api/track` rate-limits 60 req/min per visitor and ignores bots.

### FR-8 Creator stats & advice (`/r/{owner}/{repo}/stats`)
- FR-8.1 (P1) Stage 1 audit cards: missing quickstart in top 30 lines, missing mermaid, missing demo media; each with a copyable snippet.
- FR-8.2 (P1) "Copy optimized README hero" button → Markdown: title, one-line pitch, badge line, quickstart block, mermaid block (or demo media), link back.
- FR-8.3 (P2) Stage 2 when this repo has ≥ 10 views: table of views / intent / intent rate / bounce rate per variant, a winner sentence, a guardrail warning if any variant's bounce rate > 1.5× control, and a low-sample warning below 30 views per arm.

### FR-9 Distribution
- FR-9.1 (P1) `/api/og/[owner]/[repo]` via `next/og` (`ImageResponse`), 1200×630: name, description (truncated), stars, language, hero snippet, "Would you clone this?". Set `og:image`, `twitter:card=summary_large_image` on `/r/...`.
- FR-9.2 (P1) Copyable Discord prompt with `?ref=discord` link (no `@everyone`).

### FR-10 Insights dashboard (`/insights`) (P2)
- FR-10.1 Aggregate per-variant views, intent rate, bounce rate, n.
- FR-10.2 Breakdown by `repo_language` (Redis hash `exp:lang:{lang}:variant:{v}`).
- FR-10.3 Guardrail status chip per variant (OK / Watch / Breach).
- FR-10.4 Link to the Flagsmith experiment results page as the source of truth; label Redis numbers "live counters".
- FR-10.5 Admin drawer (behind `ADMIN_TOKEN` query/cookie) that explains and links to the `visual_heavy_repos` segment override in Flagsmith. Overrides are made in Flagsmith, not via our API.

## 2. Non-functional requirements

- NFR-1 Performance: cached `/r/...` TTFB < 500 ms on Vercel; uncached < 2 s; LCP < 2.5 s on 4G.
- NFR-2 Reliability: if Flagsmith is unreachable, render control and log; never 500 the card.
- NFR-3 Security: secrets only in env vars; no Flagsmith admin/API key in client bundles; sanitize all README-derived HTML/Mermaid; `rel="noopener noreferrer"` on outbound links.
- NFR-4 Privacy: anonymous ids only; no IPs stored; mention it in footer.
- NFR-5 Accessibility: keyboard-reachable copy buttons, visible focus, `aria-live` "Copied!" feedback, contrast AA.
- NFR-6 Data integrity: simulated traffic only in a non-production Flagsmith environment and a separate Redis prefix (`sim:`).
- NFR-7 Quality: TypeScript strict; `pnpm lint`, `pnpm typecheck`, `pnpm test` pass before each commit.

## 3. Environment variables

| Name | Where | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | server | GitHub REST auth |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server | Cache + counters |
| `FLAGSMITH_SERVER_KEY` | server | Server-side environment key (`ser.…`) for flagsmith-nodejs |
| `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID` | client | Client environment key (only if client SDK is used) |
| `FLAGSMITH_API_URL` | server | Optional; defaults to Flagsmith Cloud |
| `NEXT_PUBLIC_SITE_URL` | both | Absolute URL for OG + share links |
| `ADMIN_TOKEN` | server | Gates the `/insights` admin drawer |
| `TELEMETRY_PREFIX` | server | `""` in prod, `sim:` for simulation |

## 4. Acceptance checklist (Phase 1 done = all true)

- [ ] Pasting `vercel/next.js` produces a card in < 2 s and a cached reload in < 500 ms.
- [ ] Two different browsers can receive different variants; each stays sticky on refresh.
- [ ] Copying the command and clicking GitHub both appear as events in Flagsmith for that identity.
- [ ] Experiment shows exposures for both variations in the Flagsmith dashboard.
- [ ] Bounce guardrail fires when closing a tab within 5 s without converting, and not otherwise.
- [ ] `/stats` shows Stage 1 audit and the export button copies valid Markdown.
- [ ] Discord unfurl shows the OG image.
- [x] Parser unit tests cover: mermaid present/absent, quickstart tagged/untagged/absent, relative media, empty README.
