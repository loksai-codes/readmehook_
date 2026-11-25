# lib/telemetry
- `events.ts` — event-name contract (done). Must match Flagsmith metric events exactly.
- `client.ts` — `trackExperimentEvent(name, { repoSlug, variant })` → fetch/sendBeacon `/api/track`.
- `server.ts` — `recordEvent()` dual-write: Flagsmith + Redis counters.
