# Deploy to Vercel

Project: **`loksai/readmehook`** (already created and linked with `vercel link`). Vercel detects Next.js; no `vercel.json` is needed. Next.js 16, Cache Components / Partial Prerendering, `proxy.ts`, `next/og` and `after()` are all supported on Vercel.

Flagsmith exposures and events are flushed with `after(flushFlagsmith)`, which Vercel keeps alive with `waitUntil` after the response is sent, so responses don't wait on the Flagsmith events API.

## Environment variables

Vercel → Project → Settings → Environment Variables, or `vercel env add <NAME> --environment <production|preview|development>`.

| Variable | Production | Preview + Development | Status |
|---|---|---|---|
| `FLAGSMITH_SERVER_KEY` | Flagsmith **Production** server key (`ser.…`, key `vercel-production` under Production → Settings → Keys) | Flagsmith Development server key | Preview/Dev set · **Production: add it yourself** |
| `FLAGSMITH_ENV_NAME` | `production` | `development` | set |
| `TELEMETRY_PREFIX` | leave unset (no prefix) | `dev:` | set |
| `GITHUB_TOKEN` | fine-grained PAT, public repos read-only | same | set |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash REST credentials | same DB (dev counters live under `dev:`) | set |
| `ADMIN_TOKEN` | long random string; open `/insights?admin=<token>` once | same | set |
| `NEXT_PUBLIC_SITE_URL` | only for a custom domain; defaults to the Vercel production domain | not needed | optional |
| `FLAGSMITH_EXPERIMENT_URL` | optional; results link on `/insights`, defaults to Production experiment 485 | Development experiment 484 URL, if you like | optional |

Add the missing Production key (paste it when prompted; never commit it):

```bash
vercel env add FLAGSMITH_SERVER_KEY --environment production
```

Env var changes apply to the **next** deployment, so redeploy after adding or changing one.

## Deploy

Either connect the GitHub repo (Project → Settings → Git → `loksai-codes/readmehook_`) so every push to `main` deploys to Production, or deploy from this folder:

```bash
vercel deploy --prod
```

## Launch checklist (requirements.md §4)

1. [ ] `FLAGSMITH_SERVER_KEY` (Production) is set, then deploy.
2. [ ] Pasting `vercel/next.js` produces a card in < 2 s and a cached reload in < 500 ms.
3. [ ] Smoke test: `/`, `/r/vercel/next.js`, `/r/vercel/next.js/stats`, `/api/og/vercel/next.js`, `/insights` all return 200; the card shows content, not only the loading skeleton.
4. [ ] Two different browsers can receive different variants; each stays sticky on refresh. *(Verified in Development.)*
5. [ ] Copying the command and clicking GitHub both appear as events in Flagsmith for that identity.
6. [ ] Experiment shows exposures for both variations in the Flagsmith dashboard. *(Verified in Development.)*
7. [ ] Bounce guardrail fires when closing a tab within 5 s without converting, and not otherwise.
8. [ ] `/stats` shows the Stage 1 audit and the export button copies valid Markdown.
9. [ ] Discord unfurl shows the OG image (use a fresh `?ref=discord` URL; Discord caches unfurls).
10. [x] Parser unit tests cover mermaid present/absent, quickstart tagged/untagged/absent, relative media, empty README.
11. [ ] `?variant=` does nothing on the deployed site (dev-only; compiled out of production builds).

## Experiment

Production experiment 485 is already **running** in Flagsmith. Until the Production server key is set and deployed, the site serves control to everyone and sends no events (fail open), so no visitors are lost to a half-configured deploy; they simply aren't counted. Once deployed, open a card in a private window and check the identity appears under Flagsmith → Production → Identities.
