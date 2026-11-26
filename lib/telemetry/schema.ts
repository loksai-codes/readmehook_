/** FR-7.3: the `/api/track` body. Pure, shared by the route and tests. The identity is never in here. */
import { z } from 'zod';
import { HERO_LAYOUTS } from '@/lib/flagsmith/variants';
import { isValidSlug } from '@/lib/github/slug';
import { CONVERSION_SOURCES, isEventName, SOURCE_EVENT, type EventName } from './events';

/** Bodies above this are rejected before parsing. */
export const MAX_TRACK_BODY_BYTES = 1024;

export const trackBodySchema = z
  .object({
    event: z.custom<EventName>(isEventName, { message: 'unknown event' }),
    repoSlug: z
      .string()
      .max(201)
      .refine((s) => {
        const parts = s.split('/');
        return parts.length === 2 && isValidSlug(parts[0]!, parts[1]!);
      }, 'invalid repo slug'),
    variant: z.enum(HERO_LAYOUTS),
    /** Optional: which control fired a conversion (Redis confound check only). */
    source: z.enum(CONVERSION_SOURCES).optional(),
  })
  .strict()
  .refine((b) => b.source === undefined || SOURCE_EVENT[b.source] === b.event, 'source does not match event');

export type TrackBody = z.infer<typeof trackBodySchema>;

/** Parses raw request text. Returns null for anything that isn't a valid, allow-listed event. */
export function parseTrackBody(raw: string): TrackBody | null {
  if (!raw || raw.length > MAX_TRACK_BODY_BYTES) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = trackBodySchema.safeParse(json);
  return result.success ? result.data : null;
}
