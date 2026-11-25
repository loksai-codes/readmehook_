/**
 * Simulated traffic for the DEVELOPMENT environment only. See scripts/README.md.
 *
 *   # terminal 1: the server must run against the Development key with the sim: prefix
 *   TELEMETRY_PREFIX=sim: FLAGSMITH_ENV_NAME=development pnpm dev
 *   # terminal 2
 *   TELEMETRY_PREFIX=sim: FLAGSMITH_ENV_NAME=development pnpm simulate -- --visitors 200 --rate 5
 *
 * Each visitor gets a fresh cookie jar, loads a card (the server evaluates Flagsmith and records the
 * exposure), reads the variant from the page, then sends events through the real /api/track.
 * Simulated numbers are pipeline checks, never experiment results.
 */
import {
  parseArgs,
  pickRef,
  planVisitor,
  refusalReason,
  rng,
  serverPrefixFromInsights,
  variantFromHtml,
  visitorIdFromSetCookie,
  type SimEvent,
} from './simulate-lib';
import type { HeroLayout } from '../lib/flagsmith/variants';

// A real-browser user agent: the app ignores bots, and the simulator must look like a visitor.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 ReadmeHookSim/1.0';

type Tally = Record<string, { visitors: number; events: Partial<Record<SimEvent, number>> }>;

async function serverPrefix(base: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}/insights`, { headers: { 'user-agent': UA } });
    if (!res.ok) return null;
    return serverPrefixFromInsights(await res.text());
  } catch {
    return null;
  }
}

async function visit(
  base: string,
  repo: string,
  rand: () => number,
  opts: ReturnType<typeof parseArgs>,
): Promise<{ variant: HeroLayout; events: SimEvent[]; failed: number }> {
  const ref = pickRef(rand);
  const page = await fetch(`${base}/r/${repo}${ref ? `?ref=${ref}` : ''}`, {
    headers: { 'user-agent': UA },
    redirect: 'manual',
  });
  const html = await page.text();
  const vid = visitorIdFromSetCookie(page.headers.getSetCookie());
  const variant = variantFromHtml(html);
  if (!page.ok || !vid || !variant) {
    throw new Error(`card ${repo}: status ${page.status}, rh_vid ${vid ? 'set' : 'missing'}, variant ${variant ?? 'missing'}`);
  }

  const events = planVisitor(variant, opts, rand);
  let failed = 0;
  for (const event of events) {
    const res = await fetch(`${base}/api/track`, {
      method: 'POST',
      headers: { 'user-agent': UA, 'content-type': 'text/plain;charset=UTF-8', cookie: `rh_vid=${vid}` },
      body: JSON.stringify({ event, repoSlug: repo, variant }),
    });
    if (res.status !== 204) failed++;
  }
  return { variant, events, failed };
}

async function main() {
  let opts: ReturnType<typeof parseArgs>;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`simulate-traffic: ${(err as Error).message}`);
    process.exitCode = 2;
    return;
  }

  const refusal = refusalReason({
    envName: process.env.FLAGSMITH_ENV_NAME,
    prefix: process.env.TELEMETRY_PREFIX,
    base: opts.base,
    allowRemote: opts.allowRemote,
    serverPrefix: await serverPrefix(opts.base),
  });
  if (refusal) {
    console.error(`Refusing to simulate: ${refusal}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Simulating ${opts.visitors} visitors at ${opts.rate}/s against ${opts.base} (${opts.repos.join(', ')}), seed ${opts.seed}`,
  );
  const rand = rng(opts.seed);
  const tally: Tally = {};
  let errors = 0;
  let trackFailures = 0;
  const inFlight: Promise<void>[] = [];

  for (let i = 0; i < opts.visitors; i++) {
    const repo = opts.repos[Math.floor(rand() * opts.repos.length)]!;
    inFlight.push(
      visit(opts.base, repo, rand, opts)
        .then(({ variant, events, failed }) => {
          const t = (tally[variant] ??= { visitors: 0, events: {} });
          t.visitors++;
          for (const e of events) t.events[e] = (t.events[e] ?? 0) + 1;
          trackFailures += failed;
        })
        .catch((err: Error) => {
          errors++;
          if (errors <= 5) console.warn(`  visitor ${i + 1}: ${err.message}`);
        }),
    );
    await new Promise((r) => setTimeout(r, 1000 / opts.rate));
  }
  await Promise.all(inFlight);

  console.log('\nVariant              visitors  copied  outbound  intent  bounced');
  for (const [variant, t] of Object.entries(tally).sort()) {
    const e = t.events;
    console.log(
      `${variant.padEnd(20)} ${String(t.visitors).padStart(8)}  ${String(e.clone_command_copied ?? 0).padStart(6)}  ${String(e.github_outbound_click ?? 0).padStart(8)}  ${String(e.developer_intent ?? 0).padStart(6)}  ${String(e.bounce_under_5s ?? 0).padStart(7)}`,
    );
  }
  console.log(`\nErrors: ${errors} visitors failed, ${trackFailures} /api/track calls not 204`);
  console.log('These are simulated pipeline numbers for Development. Never report them as experiment results.');
  // exitCode, not process.exit(): exiting with fetch sockets still open crashes libuv on Windows.
  if (errors > 0 || trackFailures > 0) process.exitCode = 1;
}

void main();
