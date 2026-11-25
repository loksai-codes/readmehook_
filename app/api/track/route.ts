import type { NextRequest } from 'next/server';
import { flushFlagsmith } from '@/lib/flagsmith/flush';
import { isBot } from '@/lib/identity/bots';
import { isValidVisitorId, VISITOR_COOKIE } from '@/lib/identity/visitorId';
import { parseTrackBody } from '@/lib/telemetry/schema';
import { isRateLimited, recordEvent } from '@/lib/telemetry/server';

// No `runtime`/`dynamic` exports: cacheComponents forbids them, and POST handlers already run
// dynamically on the Node.js runtime.

function status(code: number): Response {
  return new Response(null, { status: code, headers: { 'cache-control': 'no-store' } });
}

/**
 * POST /api/track (FR-7.3, FR-7.6).
 * 1. Bots are ignored (204, nothing recorded).
 * 2. Identity is the `rh_vid` cookie, never the body (CLAUDE.md rule 4).
 * 3. Body: allow-listed event name, `owner/repo` slug, known variant.
 * 4. 60 events per visitor per minute.
 * 5. Dual-write: Flagsmith event for the identity + Redis counters, then the Flagsmith buffer is
 *    flushed before the response so nothing is stranded when Amplify's Lambda freezes.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (isBot(request.headers.get('user-agent'))) return status(204);

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!isValidVisitorId(visitorId)) return status(400);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return status(400);
  }
  const body = parseTrackBody(raw);
  if (!body) return status(400);

  if (await isRateLimited(visitorId)) return status(429);

  try {
    const { flagsmith } = await recordEvent(visitorId, body);
    if (flagsmith) await flushFlagsmith();
  } catch (err) {
    console.error('[track] recordEvent failed', err);
  }
  return status(204);
}
