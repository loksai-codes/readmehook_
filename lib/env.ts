import 'server-only';

const warned = new Set<string>();

/**
 * Returns a server env var, or null when unset/blank. A missing var is logged once per process,
 * so a misconfigured deploy is loud in the logs while the page still fails open (CLAUDE.md rule 10).
 */
export function serverEnv(name: string, consequence: string): string | null {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!warned.has(name)) {
    warned.add(name);
    console.error(`[env] ${name} is not set: ${consequence}`);
  }
  return null;
}
