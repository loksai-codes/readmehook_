/**
 * FR-5.3: crawler / unfurler / scripted-client detection. Bots get the control layout and are
 * never identified to Flagsmith or counted in telemetry. Pure.
 */
const BOT_UA_RE = new RegExp(
  [
    'bot\\b',
    'bot/',
    'crawl',
    'spider',
    'slurp',
    'discordbot',
    'twitterbot',
    'slackbot',
    'slack-imgproxy',
    'facebookexternalhit',
    'facebookcatalog',
    'linkedinbot',
    'whatsapp',
    'telegrambot',
    'embedly',
    'quora link preview',
    'pinterest',
    'redditbot',
    'skypeuripreview',
    'vkshare',
    'mastodon',
    'bluesky',
    'cardyb',
    'iframely',
    'headlesschrome',
    'phantomjs',
    'puppeteer',
    'playwright',
    'lighthouse',
    'pagespeed',
    'vercel-screenshot',
    'vercel-favicon',
    'curl/',
    'wget/',
    'httpie/',
    'python-requests',
    'python-urllib',
    'aiohttp',
    'go-http-client',
    'node-fetch',
    'undici',
    'axios/',
    'okhttp',
    'java/',
    'libwww-perl',
    'postmanruntime',
    'insomnia',
  ].join('|'),
  'i',
);

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true;
  return BOT_UA_RE.test(userAgent);
}
