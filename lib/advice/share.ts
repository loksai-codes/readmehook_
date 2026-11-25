/** FR-9.2 share links and Discord prompt. PURE. */

export function cardPath(owner: string, repo: string): string {
  return `/r/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function cardUrl(origin: string, owner: string, repo: string, ref?: 'discord' | 'twitter'): string {
  const base = `${origin.replace(/\/+$/, '')}${cardPath(owner, repo)}`;
  return ref ? `${base}?ref=${ref}` : base;
}

/** PRD §7 prompt. Never pings (@everyone / @here are stripped defensively). */
export function discordPrompt(origin: string, owner: string, repo: string): string {
  const link = cardUrl(origin, owner, repo, 'discord');
  return `Hey everyone! Built a tool for Toggle Wars. Not sure if my README makes sense in 5 seconds — test my ReadmeHook link and tell me if you'd clone it: ${link}`.replace(
    /@(everyone|here)\b/g,
    '$1',
  );
}
