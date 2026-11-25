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
