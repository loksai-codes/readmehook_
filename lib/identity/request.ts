/** Request classification helpers shared by proxy.ts and server components. Pure. */
import { isBot } from './bots';

type HeaderGetter = { get(name: string): string | null };

/** Browser / Next router prefetches must never count as a page view or an exposure (FR-6.2). */
export function isPrefetchRequest(headers: HeaderGetter): boolean {
  const purpose = `${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''}`.toLowerCase();
  return purpose.includes('prefetch') || headers.get('next-router-prefetch') !== null;
}

export type RequestKind = 'human' | 'bot' | 'prefetch';

export function classifyRequest(headers: HeaderGetter): RequestKind {
  if (isBot(headers.get('user-agent'))) return 'bot';
  if (isPrefetchRequest(headers)) return 'prefetch';
  return 'human';
}
