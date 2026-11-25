# scripts

## simulate-traffic.ts (Development only)
Sends synthetic visitors through the real card page + `/api/track` to verify the pipeline end to end (Flagsmith exposures and events, Redis counters) and to make the dashboards non-empty in dev.

```bash
# terminal 1: a LOCAL server on the Development Flagsmith key, counters under sim:
TELEMETRY_PREFIX=sim: FLAGSMITH_ENV_NAME=development pnpm dev

# terminal 2
TELEMETRY_PREFIX=sim: FLAGSMITH_ENV_NAME=development pnpm simulate -- \
  --base http://localhost:3000 --repos vercel/next.js,astral-sh/uv --visitors 200 --rate 5
```

**Refuses to run unless all of these hold** (`scripts/simulate-lib.ts`, unit-tested):
- the script's `FLAGSMITH_ENV_NAME` is exactly `development`;
- the script's `TELEMETRY_PREFIX` is exactly `sim:`;
- `--base` is localhost (or `--allow-remote` is passed for a non-production dev deploy);
- the **target server** reports `TELEMETRY_PREFIX=sim:` on `/insights`. The server's env, not the script's, decides which Flagsmith environment and Redis keys receive the traffic, so this is what keeps simulated traffic out of Production.

**Each visitor:** fresh identity → `GET /r/owner/repo?ref=<discord|twitter|none>` (the server evaluates the experiment flag and records the exposure) → variant read from `data-variant` → `card_view`, then with per-variant probabilities `clone_command_copied` / `github_outbound_click` (+ one `developer_intent`), or maybe `bounce_under_5s` if it didn't convert. The user agent is a normal browser string, so the app doesn't treat visitors as bots.

| Flag | Default | |
|---|---|---|
| `--base` | `http://localhost:3000` | target server |
| `--repos` | `vercel/next.js` | comma-separated `owner/repo` |
| `--visitors` | `100` | |
| `--rate` | `5` | visitors started per second |
| `--seed` | `1` | reproducible runs |
| `--copy`, `--outbound`, `--bounce` | see `DEFAULT_RATES` | per-variant overrides, e.g. `--copy quickstart_first=0.2,architecture_first=0.1` |
| `--allow-remote` | off | allow a non-localhost `--base` |

The default rates are made up to exercise the pipeline. **Never present simulated numbers as experiment results.** Judges want real events, and `docs/results.md` uses only Production numbers from Flagsmith.

## smoke.ts
Not written yet. The manual smoke test after each deploy is step 3 of `docs/deploy-vercel.md`.
