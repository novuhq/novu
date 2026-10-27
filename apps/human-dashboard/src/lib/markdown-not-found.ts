import { isHostId } from './host-ids';
import { SITE_ORIGIN } from './seo';

/**
 * Pages and route handlers with no dynamic segment, plus the metadata files Next serves beside them
 * (`/sitemap.xml`, `/icon`). A new one has to be named here: an agent that asks for Markdown otherwise
 * hears that the page is missing.
 */
const EXACT_PATHS = new Set([
  '/',
  '/.well-known/agent-skills/index.json',
  '/.well-known/ard.json',
  '/agents.md',
  '/api/webhooks/clerk',
  '/apple-icon',
  '/apple-icon.png',
  '/claim',
  '/cli/login',
  '/configure',
  '/configure/share-image',
  '/connect',
  '/connect/slack/result',
  '/contacts',
  '/favicon.ico',
  '/icon',
  '/icon.svg',
  '/inbox',
  '/index.md',
  '/llms.txt',
  '/mcp/connect',
  '/onboarding',
  '/robots.txt',
  '/sapien',
  '/settings',
  '/settings/billing',
  '/sign-in',
  '/sign-in/sso-callback',
  '/sign-up',
  '/sign-up/sso-callback',
  '/sitemap.xml',
]);

/**
 * Anything under these is a real route or a file in `public/`. `/api/` is the proxy to the Novu API,
 * `/.well-known/` is skills and the ARD catalog, `/v1/` is rewritten to that API, and the rest are
 * pictures and fonts. `/p/`, `/invite/` and `/verify/` are one dynamic segment.
 */
const PREFIXES = [
  '/.well-known/',
  '/api/',
  '/brand/',
  '/fonts/',
  '/illustrations/',
  '/images/',
  '/invite/',
  '/media/',
  '/p/',
  '/tools/',
  '/v1/',
  '/verify/',
];

/** A file the browser loads. Markdown documents are not in here: a missing `.md` is a missing page. */
const STATIC_ASSET = /\.(?:avif|css|gif|ico|jpe?g|js|map|mjs|mp4|png|svg|ttf|webm|webp|woff2?)$/i;

const RECOVERY = {
  llms: `${SITE_ORIGIN}/llms.txt`,
  sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  docs: `${SITE_ORIGIN}/index.md`,
} as const;

/** Drop a trailing slash and decode once, so `/sapien/` is the same page as `/sapien`. */
export function normalizePathname(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    path = pathname;
  }
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  return path;
}

/**
 * Whether Next has something to serve here other than the site-wide not-found page. The host pages are
 * the exception to a single-segment match: only the hosts in the list exist (`/claude-code`, `/claude-code.md`).
 */
export function servesAppResource(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === '/_next' || path.startsWith('/_next/')) return true;
  if (EXACT_PATHS.has(path)) return true;
  if (PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (isHostResource(path)) return true;
  if (STATIC_ASSET.test(path)) return true;
  if (/\/(?:opengraph-image|twitter-image)(?:\.[a-z0-9]+)?$/i.test(path)) return true;

  return false;
}

/** A host's page (`/codex`), its Markdown (`/codex.md`), or the file that Markdown is rewritten to. */
function isHostResource(path: string): boolean {
  const markdown = /^\/([^/]+)\.md$/.exec(path);
  if (markdown) return isHostId(markdown[1]);

  const index = /^\/([^/]+)\/index\.md$/.exec(path);
  if (index) return isHostId(index[1]);

  const page = /^\/([^/]+)$/.exec(path);
  if (page) return isHostId(page[1]);

  return false;
}

/** The quality of one media type in an Accept header. Absent, or `q=0`, is a refusal. */
function mediaQuality(accept: string, mediaType: string): number {
  let best = 0;
  for (const part of accept.split(',')) {
    const [media, ...params] = part
      .trim()
      .split(';')
      .map((piece) => piece.trim());
    if (media.toLowerCase() !== mediaType) continue;

    let quality = 1;
    for (const param of params) {
      const match = /^q=(\d+(?:\.\d+)?)$/i.exec(param);
      if (match) quality = Number(match[1]);
    }
    if (quality > best) best = quality;
  }

  return best;
}

/**
 * Whether this client wants Markdown for the URL it asked for. `text/markdown` wins when it is listed
 * and its quality is at least HTML's. A browser's Accept header does not list it, so the HTML page stays.
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept?.toLowerCase().includes('text/markdown')) return false;

  const markdown = mediaQuality(accept, 'text/markdown');
  if (markdown <= 0) return false;

  return markdown >= mediaQuality(accept, 'text/html');
}

/** What an agent reads when the page is not there. The links are how it finds a page that is. */
function markdownNotFoundBody(pathname: string): string {
  const where = displayPath(pathname);

  return `# Page not found

No page is published at ${where}. The address may be misspelled, or the page may have been moved.

Use the documentation index or the sitemap to find a page that exists:

- [Documentation index](${RECOVERY.llms})
- [Sitemap](${RECOVERY.sitemap})
- [Agent Inbox documentation](${RECOVERY.docs})
`;
}

/** The path, as a code span, or a fixed phrase when it would break the Markdown. */
function displayPath(pathname: string): string {
  const path = normalizePathname(pathname)
    .replace(/[`\r\n]/g, '')
    .slice(0, 300);
  if (!path.startsWith('/') || path.includes('://')) return 'this address';

  return `\`${path}\``;
}

/** HTTP 404, with the Markdown above. The status stays 404: a body does not make the page exist. */
export function markdownNotFoundResponse(pathname: string): Response {
  return new Response(markdownNotFoundBody(pathname), {
    status: 404,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      Link: `<${RECOVERY.llms}>; rel="describedby"`,
    },
  });
}
