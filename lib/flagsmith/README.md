# lib/flagsmith (server-only)
- `client.ts` — `@flagsmith/nodejs` (>= 9.1) singleton, `enableEvents: true`, flush timer off (`flushInterval: 0`) for serverless. Missing `FLAGSMITH_SERVER_KEY` → null (control, no events).
- `variants.ts` — flag/variant contract.
- `traits.ts` — `buildHeroTraits()` and `planVariant()` (dev override / Flagsmith / control for bots, prefetch, no id).
- `evaluate.ts` — `evaluateHeroLayout(visitorId, traits)` via `getExperimentFlag()` (records the exposure); fails open to CONTROL.
- `track.ts` — `trackFlagsmithEvent(visitorId, event)` via `trackEvent(event, { identifier })`.
- `flush.ts` — `flushFlagsmith()`: `flushEvents()` capped at 5 s; scheduled with `after(flushFlagsmith)` (Vercel `waitUntil`) by every request that tracked something.
