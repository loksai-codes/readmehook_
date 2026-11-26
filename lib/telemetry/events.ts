/** Event-name contract. Must match Flagsmith metric event names exactly (case-sensitive). */
export const EVENTS = {
  CARD_VIEW: 'card_view',
  CLONE_COMMAND_COPIED: 'clone_command_copied',
  GITHUB_OUTBOUND_CLICK: 'github_outbound_click',
  DEVELOPER_INTENT: 'developer_intent', // primary metric, once per visitor per repo
  BOUNCE_UNDER_5S: 'bounce_under_5s', // guardrail
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export const ALLOWED_EVENTS: readonly EventName[] = Object.values(EVENTS);

export const BOUNCE_THRESHOLD_MS = 5000;

/** Redis hash field per event. */
export const COUNTER_FIELD: Record<EventName, string> = {
  card_view: 'views',
  clone_command_copied: 'clones',
  github_outbound_click: 'outbound',
  developer_intent: 'intent',
  bounce_under_5s: 'bounces',
};

/**
 * Which control fired a conversion, for the confound check (the treatment hero has an extra copy
 * button). Redis-only: never sent to Flagsmith, so the experiment's events are unchanged.
 */
export const CONVERSION_SOURCES = ['clone_box', 'quickstart_copy', 'github_cta'] as const;
export type ConversionSource = (typeof CONVERSION_SOURCES)[number];

/** The only event each source may accompany. */
export const SOURCE_EVENT: Record<ConversionSource, EventName> = {
  clone_box: 'clone_command_copied',
  quickstart_copy: 'clone_command_copied',
  github_cta: 'github_outbound_click',
};

/**
 * Redis hash fields for the per-source counters. `src_views` counts card views from the moment
 * source tracking shipped, so source rates share a denominator that started at the same time.
 */
export const SOURCE_VIEWS_FIELD = 'src_views';
export function sourceField(source: ConversionSource): string {
  return `src_${source}`;
}

export function isEventName(value: unknown): value is EventName {
  return typeof value === 'string' && (ALLOWED_EVENTS as readonly string[]).includes(value);
}

/** FR-7.6 */
export const TRACK_RATE_LIMIT_PER_MIN = 60;

export const TRACK_ENDPOINT = '/api/track';
