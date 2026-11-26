# Flagsmith setup — flag, metrics, experiment

Two routes. **Route A** (fastest): let a coding agent run Flagsmith's official coding-agent setup prompt (linked below). **Route B**: click through the dashboard yourself using the values below. Either way, the values must match exactly.

Reference: https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent

## 0. Account & environments

1. Sign up / log in to Flagsmith Cloud. Create project **ReadmeHook**.
2. Keep two environments: **Development** (local + simulated traffic) and **Production** (real visitors only).
3. Confirm Experimentation is enabled for the project/environment and that the environment has its analytics warehouse connected (the setup prompt checks this; experiments can't record results without it). If the hackathon gave you a promo/plan for Experimentation, apply it now.
4. Copy each environment's **server-side key** (`ser.…`) into `FLAGSMITH_SERVER_KEY` (Development key in `.env.local`, Production key in the Vercel project's Production environment variables, see docs/deploy-vercel.md).

## 1. Multivariate flag

| Field | Value |
|---|---|
| Name / key | `repo_hero_layout` |
| Type | Multivariate, string |
| Control (default) value | `architecture_first` |
| Variation 1 | key **and** value `quickstart_first` |
| Variation 2 | key **and** value `demo_gif_first` (0% in Phase 1) |
| Enabled | On, in both environments |

Every variation **needs a key**. Keyless variations record no exposures.

## 2. Metrics

| Metric name | Event (exact, case-sensitive) | Aggregation | Direction | Role |
|---|---|---|---|---|
| Developer intent | `developer_intent` | occurrence | up | **Primary** |
| Clone command copied | `clone_command_copied` | occurrence | up | Secondary |
| GitHub outbound click | `github_outbound_click` | occurrence | up | Secondary |
| Fast bounce | `bounce_under_5s` | occurrence | **down** | Guardrail |

## 3. Experiment

| Field | Value |
|---|---|
| Name | Hero layout: quickstart vs architecture |
| Feature | `repo_hero_layout` |
| Hypothesis | See `docs/experiment-plan.md` (paste verbatim) |
| Metrics | Developer intent (primary) + the others above |
| Allocation (Phase 1) | `quickstart_first` 50%, control `architecture_first` gets the remaining 50% |
| Allocation (full vision, only with enough traffic) | 33 / 33 / 34 |

Leave it **not started** until the code is deployed and verified. Then start it in **Production** and confirm status is `running`. While it runs the flag is locked, so plan any allocation changes before starting.

## 4. Segment (Phase 2 demo)

- Segment `visual_heavy_repos`: trait `has_demo_video` **equals** `true`.
- Segment override on `repo_hero_layout` → `demo_gif_first`.
- Use it in the video as the "route visual-heavy repos to the demo layout" moment. Do it **after** you've captured experiment results, or in Development, so it doesn't distort the running test (check whether the locked experiment flag allows overrides; if not, demo it in Development).

## 5. Verify (before announcing on Discord)

- [ ] Open the card in two browsers (or one + incognito) → both variants appear across a few tries; each is sticky on refresh.
- [ ] Identity `rh_vid` shows up under Identities with traits `repo_language`, `has_demo_video`, `has_mermaid_diagram`, `referrer_source`.
- [ ] Copy command + click GitHub → events arrive; exposures counted on the experiment page.
- [ ] Refresh results (rate-limited to once per ~5 min).

## Troubleshooting

- **No exposures** → variation without a key; flag requested before identify; events not flushed (serverless!).
- **Conversions missing** → event name mismatch, or different identifier between exposure and event.
- **Nothing in Production** → still pointing at the Development key.

## 6. Current setup (created 2026-11-25 via the Flagsmith CLI, Cloud)

No keys here: server keys live in `.env.local` (Development) and the Vercel project's Production environment variables; the admin API key lives outside the repo.

| | Development | Production |
|---|---|---|
| Project | ReadmeHook (56121) | ReadmeHook (56121) |
| Environment key (client-side id) | `Cs3wRiFhcy9fdwkyc9XvqY` | `iKpcbAp4Uc2tHEaYZuwCre` |
| Flag `repo_hero_layout` | id 304390, control `architecture_first`, enabled | same |
| Variations | `quickstart_first` (36852), `demo_gif_first` (36853) | same |
| Metrics: intent / clone / outbound / bounce | 463 / 464 / 465 / 466 | 467 / 468 / 469 / 470 |
| Experiment "Hero layout: quickstart vs architecture" | 484, **running** (verification) | 485, **created, not started** |

Allocation in both: rollout 100%, `quickstart_first` 50%, `demo_gif_first` 0%, control the remaining 50%. The bounce metric's expected direction is `not_increase` (guardrail).

Start Production only after the Vercel deploy is verified (docs/deploy-vercel.md):

```bash
flagsmith api -X POST api/v1/environments/iKpcbAp4Uc2tHEaYZuwCre/experiments/485/start/
```

Dashboard: https://app.flagsmith.com/project/56121/environment/iKpcbAp4Uc2tHEaYZuwCre/experiments/485

## 7. Vercel environment variables (project `loksai/readmehook`, see docs/deploy-vercel.md)

| Variable | Production | Preview + Development |
|---|---|---|
| `FLAGSMITH_SERVER_KEY` | Flagsmith Production server key `vercel-production` (id 10571) | Flagsmith Development server key |
| `FLAGSMITH_ENV_NAME` | `production` | `development` |
| `TELEMETRY_PREFIX` | unset (= no prefix) | `dev:` |
| `GITHUB_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | shared | shared |
| `ADMIN_TOKEN` | generated, same in all targets | same |
| `NEXT_PUBLIC_SITE_URL` | optional; only for a custom domain (defaults to the Vercel production domain) | optional |

Local `.env.local` uses the Development key and `TELEMETRY_PREFIX=dev:`. Production and dev share one Upstash database; the prefix keeps dev counters out of Production's live counters.
