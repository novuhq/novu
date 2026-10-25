import type { Metadata } from 'next';

import { type Host, hostMarkdownPath, hostPath, hostSummary } from './hosts';
import { contentMetadata, type PageContent, SITE_PAGES } from './seo';

/** What a host's public page says about itself: its title, the line under it, and its Markdown for agents. */
export function hostPageContent(host: Host): PageContent {
  return {
    path: hostPath(host.id),
    title: `Agent Inbox for ${host.id === 'general' ? 'any agent' : host.name}`,
    description: hostSummary(host),
    // The site's shared card until the host pages have their own.
    image: SITE_PAGES.home.image,
    markdownPath: hostMarkdownPath(host.id),
  };
}

export function hostPageMetadata(host: Host, environment = process.env.VERCEL_ENV): Metadata {
  return contentMetadata(hostPageContent(host), environment);
}
