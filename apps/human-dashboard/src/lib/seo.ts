import type { Metadata } from 'next';

/** Where the two website pages live, whichever deployment serves them: canonical links and shares point here. */
export const SITE_ORIGIN = 'https://www.agentinbox.md';
export const SITE_NAME = 'Agent Inbox';
export const SOURCE_URL = 'https://github.com/novuhq/novu/tree/next/packages/agentinbox';
export const PACKAGE_URL = 'https://www.npmjs.com/package/@agentinbox/cli';

/**
 * Whether search engines may index the website pages. Off until launch: the pages and their text versions say
 * `noindex`, the sitemap is empty and robots.txt doesn't point to it. Crawling stays allowed, so engines read
 * the `noindex` (a page robots.txt blocks can still be listed, without its content).
 */
export const SITE_INDEXED = false;

export const SITE_PAGES = {
  home: {
    path: '/',
    title: 'Agent Inbox CLI docs — The inbox API for AI agents',
    description:
      'Give any AI agent a one-line way to reach a real person. Install @agentinbox/cli, connect a channel, and let agents ask, approve, choose, and tell.',
    // The people page's picture until the robots page has its own; alt text as in its .alt.txt.
    image: {
      path: '/sapien/opengraph-image.jpg',
      alt: 'agentinbox — The E-mail, Telegram and Slack inbox for AI agents',
    },
  },
  sapien: {
    path: '/sapien',
    title: 'Agent Inbox — Bring human decisions into your AI workflows',
    description:
      'Add human approvals, questions, choices, and updates to AI workflows with @agentinbox/cli. Connect a messaging channel and let agents wait for your decision.',
    // The route segment's opengraph-image file; alt text as in its .alt.txt.
    image: {
      path: '/sapien/opengraph-image.jpg',
      alt: 'agentinbox — The E-mail, Telegram and Slack inbox for AI agents',
    },
  },
} as const;

export type SitePage = keyof typeof SITE_PAGES;

export function pageMetadata(page: SitePage, environment = process.env.VERCEL_ENV): Metadata {
  const content = SITE_PAGES[page];
  const url = `${SITE_ORIGIN}${content.path}`;
  const index = SITE_INDEXED && environment !== 'preview' && environment !== 'development';
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
      ...(page === 'home' ? { types: { 'text/markdown': `${SITE_ORIGIN}/index.md` } } : {}),
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
  const content = SITE_PAGES[page];
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
