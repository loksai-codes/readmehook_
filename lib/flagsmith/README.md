# lib/flagsmith (server-only)
- `client.ts` — `@flagsmith/nodejs` (>= 9.1, formerly `flagsmith-nodejs`) singleton, events enabled, `FLAGSMITH_SERVER_KEY`.
- `variants.ts` — flag/variant contract (done).
- `evaluate.ts` — `evaluateHeroLayout(visitorId, traits)` via the experiment-flag API so exposures record; fail open to CONTROL.
- `track.ts` — `trackFlagsmithEvent(visitorId, event)` + flush for serverless.
Check current method names in Flagsmith docs: https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent
