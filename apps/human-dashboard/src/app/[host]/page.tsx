import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HostPage } from '@/components/hosts/host-page';
import { AgentsSection } from '@/components/pages/channels/agent-grid';
import { ChannelClosing, ChannelResources } from '@/components/pages/channels/closing';
import { ChannelFaq } from '@/components/pages/channels/faq';
import { ChannelFeatures } from '@/components/pages/channels/features';
import { ChannelHero } from '@/components/pages/channels/hero';
import { MessageTypes } from '@/components/pages/channels/message-types';
import { ReachSection } from '@/components/pages/channels/reach';
import { ChannelSetup } from '@/components/pages/channels/setup';
import { LandingShell } from '@/components/pages/channels/shared';
import { ChannelUseCases } from '@/components/pages/channels/use-cases';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { CHANNEL_IDS, isChannelId } from '@/data/channel-pages';
import { channelLandingContent, channelLandingMetadata } from '@/lib/channel-landing';
import { hostPageContent, hostPageMetadata } from '@/lib/host-seo';
import { HOST_IDS, hostOf, isHostId } from '@/lib/hosts';

/** Only registered hosts and channels have a page; other root addresses remain not found. */
export const dynamicParams = false;

export function generateStaticParams() {
  return [...HOST_IDS, ...CHANNEL_IDS].map((host) => ({ host }));
}

export async function generateMetadata(props: PageProps<'/[host]'>): Promise<Metadata> {
  const { host } = await props.params;

  return isChannelId(host) ? channelLandingMetadata(host) : isHostId(host) ? hostPageMetadata(hostOf(host)) : {};
}

/**
 * Public channel templates share this root slug with the existing host pages. A host's public page, `/claude-code`, built when the site is: what to tell the agent, then the steps, the
 * same as the dashboard's (`HostPage`). Its Markdown for agents is `/claude-code.md` (`./index.md`). Every
 * page of the site at this level that isn't a host (`/sapien`, `/connect`, …) is its own route, which wins.
 */
export default async function Page(props: PageProps<'/[host]'>) {
  const { host } = await props.params;
  if (isChannelId(host)) {
    return (
      <LandingShell>
        <SiteStructuredData content={channelLandingContent(host)} />
        <ChannelHero channel={host} />
        <ChannelFeatures channel={host} />
        <ChannelSetup channel={host} />
        <MessageTypes channel={host} />
        <AgentsSection channel={host} />
        <ReachSection channel={host} />
        <ChannelUseCases channel={host} />
        <ChannelFaq channel={host} />
        <ChannelClosing channel={host} />
        <ChannelResources channel={host} />
      </LandingShell>
    );
  }
  if (!isHostId(host)) {
    notFound();
  }

  return (
    <>
      <SiteStructuredData content={hostPageContent(hostOf(host))} />
      <HostPage hostId={host} />
    </>
  );
}
