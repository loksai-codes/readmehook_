# lib/telemetry
- `events.ts` — event-name contract. Must match Flagsmith metric events exactly.
- `schema.ts` — `/api/track` body (allow-listed event, `owner/repo`, known variant; no identity).
- `bounce.ts` — pure FR-7.4 decision.
- `client.ts` — `trackExperimentEvent(name, { repoSlug, variant }, { beacon })` and `trackConversion()` (adds the visitor's first `developer_intent` per repo).
- `server.ts` — `isRateLimited()`, `recordEvent()` dual-write: Flagsmith event + flush, Redis SADD/HINCRBY counters.
