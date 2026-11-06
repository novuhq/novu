import { AGENTS, type AgentId, CHANNELS, type ChannelId } from '@/data/channel-pages';

import { contentMetadata, type PageContent } from './seo';

export function channelLandingContent(channel: ChannelId, agent?: AgentId): PageContent {
  const details = CHANNELS[channel];
  return {
    path: `/${channel}${agent ? `/${agent}` : ''}`,
    title: agent
      ? `Connect ${AGENTS[agent].name} to ${details.name} | Agent Inbox`
      : `Agent Inbox for ${details.name} | An inbox for your AI agent`,
    description: agent
      ? `Connect ${AGENTS[agent].name} to ${details.name} with Agent Inbox. Ask questions, request approvals, offer choices, and receive updates through one CLI.`
      : details.description,
    image: {
      path: '/sapien/opengraph-image.jpg',
      alt: 'Agent Inbox connects your AI agent to email, Telegram and Slack.',
    },
  };
}
export function channelLandingMetadata(channel: ChannelId, agent?: AgentId) {
  return contentMetadata(channelLandingContent(channel, agent));
}
