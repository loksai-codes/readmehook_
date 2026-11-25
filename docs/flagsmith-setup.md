# Flagsmith setup — flag, metrics, experiment

Two routes. **Route A** (fastest): let Claude Code run Flagsmith's official coding-agent setup prompt (Prompt 3 in `prompt.md` points at it). **Route B**: click through the dashboard yourself using the values below. Either way, the values must match exactly.

Reference: https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent

## 0. Account & environments

1. Sign up / log in to Flagsmith Cloud. Create project **ReadmeHook**.
2. Keep two environments: **Development** (local + simulated traffic) and **Production** (real visitors only).
3. Confirm Experimentation is enabled for the project/environment and that the environment has its analytics warehouse connected (the setup prompt checks this; experiments can't record results without it). If the hackathon gave you a promo/plan for Experimentation, apply it now.
4. Copy each environment's **server-side key** (`ser.…`) into `FLAGSMITH_SERVER_KEY` (Development key in `.env.local`, Production key in Vercel).

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
