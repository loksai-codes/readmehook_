# scripts

## simulate-traffic.ts (Development only)
Sends synthetic visitors through the real page + /api/track to verify the pipeline and make the dashboards non-empty in dev.

- Refuses to run if `FLAGSMITH_ENV_NAME === 'production'` or `TELEMETRY_PREFIX !== 'sim:'`.
- Args: `--base http://localhost:3000 --repos vercel/next.js,astral-sh/uv --visitors 200 --rate 5`
- Each visitor: fresh cookie jar → GET `/r/owner/repo?ref=<random>` → read variant from `data-variant` attribute → with a configurable per-variant probability, POST conversion events; otherwise maybe a bounce.
- **Never** present simulated numbers as experiment results. Judges want real events.

## smoke.ts
Hits `/`, a card, `/stats`, `/api/og/...` and asserts 200s. Run after each deploy.
