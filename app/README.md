# app/ — routes (Next.js App Router)

| Route | File | Req |
|---|---|---|
| `/` | `page.tsx` — URL input + share panel | FR-1, FR-9.2 |
| `/r/[owner]/[repo]` | `r/[owner]/[repo]/page.tsx` — card, server-evaluated variant | FR-4–FR-7 |
| `/r/[owner]/[repo]/stats` | `r/[owner]/[repo]/stats/page.tsx` | FR-8 |
| `/insights` | `insights/page.tsx` (Phase 2) | FR-10 |
| `POST /api/track` | `api/track/route.ts` | FR-7.3 |
| `GET /api/og/[owner]/[repo]` | `api/og/[owner]/[repo]/route.tsx` | FR-9.1 |

`middleware.ts` (repo root) sets the `rh_vid` cookie (FR-5).
