# Deploy to AWS Amplify Hosting

Build settings live in `amplify.yml` (repo root). Amplify detects Next.js and runs it on SSR compute (platform `WEB_COMPUTE`).

## Support caveat — read first

AWS documents Amplify Hosting SSR support for **Next.js 12 through 15** and lists **Next.js streaming** and **code after a response (`after()`)** as unsupported ([docs](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)). This app is on **Next.js 16.4** with `cacheComponents` / Partial Prerendering (which streams the dynamic part of `/r/*`) and `proxy.ts`.

What the code already does about it:
- No `after()`: Flagsmith exposures and events are flushed **before** each response (`lib/flagsmith/flush.ts`).
- The card's dynamic content sits in one `<Suspense>`; if streaming is buffered, the page is just delivered whole.

What to verify on the first deploy (step 3 of the checklist below): `/r/vercel/next.js` renders the card (not only the skeleton), `/api/track` returns 204, `/api/og/vercel/next.js` returns a PNG, and a fresh browser gets an `rh_vid` cookie (proxy runs). If any of these fail, the fallback is Vercel, where the project `loksai/readmehook` already exists with Preview/Development env vars.

## Environment variables (Amplify console → App settings → Environment variables)

Set these on the **production branch**. They are copied into `.env.production` during the build (see `amplify.yml`), which is how Amplify SSR compute sees server-side variables.

| Variable | Value | Notes |
|---|---|---|
| `FLAGSMITH_SERVER_KEY` | Flagsmith **Production** server key (`ser.…`), key `vercel-production` or a new one | Flagsmith → Production → Settings → Keys |
| `FLAGSMITH_ENV_NAME` | `production` | Simulation refuses to run against this |
| `GITHUB_TOKEN` | fine-grained PAT, public repos read-only | same as `.env.local` |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL | same DB as dev; dev writes under `dev:` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token | |
| `NEXT_PUBLIC_SITE_URL` | `https://<branch>.<appId>.amplifyapp.com` or your custom domain, no trailing slash | used for `og:image` and share links; inlined at build, so **redeploy after changing it** |
| `ADMIN_TOKEN` | any long random string | gates the `/insights` admin drawer: open `/insights?admin=<token>` once; it becomes an httpOnly cookie |
| `FLAGSMITH_EXPERIMENT_URL` | optional | results link on `/insights` and `/stats`; defaults to Production experiment 485 |
| `TELEMETRY_PREFIX` | **leave unset** | Production counters have no prefix |
| `FLAGSMITH_API_URL`, `FLAGSMITH_EVENTS_API_URL` | leave unset | only for self-hosted Flagsmith |

Never commit any of these. `.env*` (except `.env.example`) and `flagsmith.env` are git-ignored.

## Launch checklist (requirements.md §4)

1. [ ] Connect the GitHub repo in Amplify, pick the production branch, confirm it picked up `amplify.yml`.
2. [ ] Set the environment variables above, then deploy. The build runs lint, typecheck and tests before `next build`.
3. [ ] Smoke test the deploy: `/`, `/r/vercel/next.js`, `/r/vercel/next.js/stats`, `/api/og/vercel/next.js`; the card shows content, not only the loading skeleton.
4. [ ] Pasting `vercel/next.js` produces a card in < 2 s and a cached reload in < 500 ms.
5. [ ] Two different browsers can receive different variants; each stays sticky on refresh. *(Verified in Development; repeat in Production after starting the experiment.)*
6. [ ] Copying the command and clicking GitHub both appear as events in Flagsmith for that identity.
7. [ ] Experiment shows exposures for both variations in the Flagsmith dashboard. *(Verified in Development.)*
8. [ ] Bounce guardrail fires when closing a tab within 5 s without converting, and not otherwise.
9. [ ] `/stats` shows the Stage 1 audit and the export button copies valid Markdown.
10. [ ] Discord unfurl shows the OG image (paste a card link in a private channel; Discord caches unfurls, so test with a fresh `?ref=discord` URL).
11. [x] Parser unit tests cover mermaid present/absent, quickstart tagged/untagged/absent, relative media, empty README.
12. [ ] `?variant=` does nothing on the deployed site (dev-only; compiled out of production builds).

## Start the experiment in Production

Only after steps 1–3 pass and one Production visit shows up as an identity in Flagsmith (Production → Identities). See the final section of `docs/flagsmith-setup.md` for ids.
