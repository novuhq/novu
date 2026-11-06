import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ChannelClosing } from '@/components/pages/channels/closing';
import { ChannelFaq } from '@/components/pages/channels/faq';
import { ChannelFeatures } from '@/components/pages/channels/features';
import { ChannelHero } from '@/components/pages/channels/hero';
import { AgentPrompts } from '@/components/pages/channels/prompts';
import { MoreCapabilities } from '@/components/pages/channels/reach';
import { ChannelSetup } from '@/components/pages/channels/setup';
import { LandingShell } from '@/components/pages/channels/shared';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { agentPagePairs, hasAgentPage, isChannelId } from '@/data/channel-pages';
import { channelLandingContent, channelLandingMetadata } from '@/lib/channel-landing';

export const dynamicParams = false;
export function generateStaticParams() {
  return agentPagePairs().map(({ channel, agent }) => ({ host: channel, agent }));
}
export async function generateMetadata({ params }: PageProps<'/[host]/[agent]'>): Promise<Metadata> {
  const { host, agent } = await params;
  return isChannelId(host) && hasAgentPage(host, agent) ? channelLandingMetadata(host, agent) : {};
}
export default async function AgentChannelPage({ params }: PageProps<'/[host]/[agent]'>) {
  const { host, agent } = await params;
  if (!isChannelId(host) || !hasAgentPage(host, agent)) notFound();
  return (
    <LandingShell>
      <SiteStructuredData content={channelLandingContent(host, agent)} />
      <ChannelHero channel={host} agent={agent} />
      <ChannelFeatures channel={host} agent={agent} />
      <ChannelSetup channel={host} agent={agent} />
      <AgentPrompts channel={host} agent={agent} />
      <MoreCapabilities channel={host} agent={agent} />
      <ChannelFaq channel={host} agent={agent} />
      <ChannelClosing channel={host} agent={agent} />
    </LandingShell>
  );
}
