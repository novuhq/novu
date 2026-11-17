import { AGENTS, type AgentId, agentPage, CHANNELS, type ChannelId, channelHub, pageFaq } from '@/data/channel-pages';

import { contentMetadata, type PageContent, SITE_ORIGIN } from './seo';

export function channelLandingContent(channel: ChannelId, agent?: AgentId): PageContent {
  const page = agent ? agentPage(channel, agent) : channelHub(channel);
  return {
    path: `/${channel}${agent ? `/${agent}` : ''}`,
    title: page.metaTitle,
    description: page.metaDescription,
    image: {
      path: '/sapien/opengraph-image.jpg',
      alt: 'Agent Inbox connects your AI agent to email, Telegram and Slack.',
    },
  };
}
export function channelLandingMetadata(channel: ChannelId, agent?: AgentId) {
  return contentMetadata(channelLandingContent(channel, agent));
}

/**
 * JSON-LD for the page's FAQ, from the same data the FAQ section renders, and on agent pages the
 * Home › Channel › Agent breadcrumb.
 */
export function channelLandingNodes(channel: ChannelId, agent?: AgentId) {
  const url = `${SITE_ORIGIN}${channelLandingContent(channel, agent).path}`;
  const faq = {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    isPartOf: { '@id': `${url}#webpage` },
    mainEntity: pageFaq(channel, agent).map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  if (!agent) return [faq];
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: CHANNELS[channel].name, item: `${SITE_ORIGIN}/${channel}` },
      { '@type': 'ListItem', position: 3, name: AGENTS[agent].name, item: url },
    ],
  };
  return [faq, breadcrumb];
}
