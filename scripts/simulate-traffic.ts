/**
 * Simulated traffic for the DEVELOPMENT environment only. See scripts/README.md.
 * Run: pnpm simulate -- --base http://localhost:3000 --repos vercel/next.js --visitors 100
 * TODO(Claude Code): implement per scripts/README.md (Prompt 6).
 */
if (process.env.FLAGSMITH_ENV_NAME === 'production' || process.env.TELEMETRY_PREFIX !== 'sim:') {
  console.error('Refusing to simulate: set FLAGSMITH_ENV_NAME=development and TELEMETRY_PREFIX=sim:');
  process.exit(1);
}
console.log('simulate-traffic: not implemented yet');
