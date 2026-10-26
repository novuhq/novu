import type { Metadata } from 'next';

/** Where the two website pages live, whichever deployment serves them: canonical links and shares point here. */
export const SITE_ORIGIN = 'https://www.agentinbox.md';
export const SITE_NAME = 'Agent Inbox';
export const SOURCE_URL = 'https://github.com/novuhq/novu/tree/next/packages/agentinbox';
export const PACKAGE_URL = 'https://www.npmjs.com/package/@agentinbox/cli';

/**
 * Whether search engines may index the website pages. Off until launch: the pages and their text versions say
 * `noindex`. Crawling stays allowed, so engines read the `noindex` (a page robots.txt blocks can still be
 * listed, without its content). The sitemap still names the public pages, and robots.txt points to it.
 *
 * `SITE_NOINDEX=true` forces `noindex` on a deployment even after this is on. Set it on staging
 * (`staging.agentinbox.md`). It is read at build time, which is when Vercel bakes the headers.
 */
export const SITE_INDEXED = false;

/** `SITE_NOINDEX=true` (or `1`) on a deployment that must stay out of search results, such as staging. */
export function siteNoindex(value: string | undefined = process.env.SITE_NOINDEX): boolean {
  const flag = value?.trim().toLowerCase();

  return flag === 'true' || flag === '1';
}

/**
 * Where `X-Robots-Tag: noindex` is sent. Staging (`SITE_NOINDEX`), preview, and development cover every
 * route. Until launch, the website pages and their text versions do.
 */
export function noindexPaths(
  environment = process.env.VERCEL_ENV,
  noindex = siteNoindex()
): 'all' | 'website' | 'none' {
  if (noindex || environment === 'preview' || environment === 'development') {
    return 'all';
  }

  if (!SITE_INDEXED) {
    return 'website';
  }

  return 'none';
}

/** Whether a website page may be indexed: off until launch, and off on staging, preview, and development. */
export function searchEnginesMayIndex(
  environment: string | undefined,
  noindex: boolean,
  siteIndexed = SITE_INDEXED
): boolean {
  return siteIndexed && !noindex && environment !== 'preview' && environment !== 'development';
}

export const SITE_PAGES = {
  home: {
    path: '/',
    title: 'Agent Inbox — The email, Slack, and Telegram inbox for AI agents',
    description:
      'An email inbox for AI agents, plus Slack and Telegram, through one CLI. Install @agentinbox/cli to ask, approve, choose, or send.',
    // The people page's picture until the robots page has its own; alt text as in its .alt.txt.
    image: {
      path: '/sapien/opengraph-image.jpg',
      alt: 'agentinbox — The E-mail, Telegram and Slack inbox for AI agents',
    },
  },
  sapien: {
    path: '/sapien',
    title: 'Agent Inbox | Email and chat inbox for AI agents',
    description:
      'An inbox for AI agents to receive messages, reply, and request input or approvals across email, Slack, Telegram, WhatsApp and iMessage.',
    // The route segment's opengraph-image file; alt text as in its .alt.txt.
    image: {
      path: '/sapien/opengraph-image.jpg',
      alt: 'Agent Inbox connects your AI agent to Email, Slack, Telegram and iMessage inbox for AI agents',
    },
  },
} as const;

export type SitePage = keyof typeof SITE_PAGES;

/** What a website page says about itself to search engines and link previews. */
export type PageContent = {
  path: string;
  title: string;
  description: string;
  image: { path: string; alt: string };
  /** Its Markdown version, for agents: `/index.md` for the home page. */
  markdownPath?: string;
};

export function pageMetadata(page: SitePage, environment = process.env.VERCEL_ENV, noindex = siteNoindex()): Metadata {
  return contentMetadata(
    { ...SITE_PAGES[page], ...(page === 'home' ? { markdownPath: '/index.md' } : {}) },
    environment,
    noindex
  );
}

/** The metadata of any website page: the two above, and each host's page (`host-seo.ts`). */
export function contentMetadata(
  content: PageContent,
  environment = process.env.VERCEL_ENV,
  noindex = siteNoindex()
): Metadata {
  const url = `${SITE_ORIGIN}${content.path}`;
  const index = searchEnginesMayIndex(environment, noindex);
  const image = {
    url: `${SITE_ORIGIN}${content.image.path}`,
    type: 'image/jpeg',
    width: 1200,
    height: 630,
    alt: content.image.alt,
  };
  return {
    // The rest of the dashboard sets no base; the picture next to `/sapien` resolves against this one.
    metadataBase: new URL(SITE_ORIGIN),
    applicationName: SITE_NAME,
    title: { absolute: content.title },
    description: content.description,
    alternates: {
      canonical: url,
      ...(content.markdownPath ? { types: { 'text/markdown': `${SITE_ORIGIN}${content.markdownPath}` } } : {}),
    },
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      url,
      title: content.title,
      description: content.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: [image],
    },
  };
}

export function siteStructuredData(page: SitePage) {
  return contentStructuredData(SITE_PAGES[page]);
}

/** What search engines read about any website page (JSON-LD). */
export function contentStructuredData(content: Pick<PageContent, 'path' | 'title' | 'description'>) {
  const url = `${SITE_ORIGIN}${content.path}`;
  const website = `${SITE_ORIGIN}/#website`;
  const code = `${SITE_ORIGIN}/#agentinbox-cli`;
  const publisher = 'https://novu.co/#organization';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': publisher,
        name: 'Novu',
        url: 'https://novu.co/',
      },
      {
        '@type': 'WebSite',
        '@id': website,
        name: SITE_NAME,
        alternateName: 'agentinbox.md',
        url: `${SITE_ORIGIN}/`,
        inLanguage: 'en',
        publisher: { '@id': publisher },
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': code,
        name: '@agentinbox/cli',
        description: SITE_PAGES.home.description,
        url: PACKAGE_URL,
        codeRepository: SOURCE_URL,
        author: { '@id': publisher },
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: content.title,
        description: content.description,
        inLanguage: 'en',
        isPartOf: { '@id': website },
        about: { '@id': code },
        publisher: { '@id': publisher },
      },
    ],
  };
}
