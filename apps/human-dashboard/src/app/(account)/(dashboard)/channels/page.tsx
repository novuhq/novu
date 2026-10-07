import { Info } from 'lucide-react';
import type { Metadata } from 'next';

import { type ChannelRow, ChannelsTable } from '@/components/channels/channels-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { type Channel, type ChannelVia, hasChannelEndpoint, listChannels } from '@/lib/human-channels-api';
import { findOperatorContactId } from '@/lib/human-operator';

export const metadata: Metadata = {
  title: 'Channels',
};

export default async function ChannelsPage() {
  const account = await requireHumanAccount({ returnTo: '/channels' });
  const rows = await loadChannelRows(account);

  return (
    <>
      <PageHeader
        title="Channels"
        description="How your agent shows up on each channel. People reply right where the message lands."
      />
      <ChannelsTable rows={rows} />
      <p className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-xs leading-4 text-secondary">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        Every channel belongs to your agent: its own address, bot and app. One account, one agent.
      </p>
    </>
  );
}

/** Email, Telegram and Slack, in that order, whether or not the agent has them yet. */
async function loadChannelRows(account: HumanAccount): Promise<ChannelRow[]> {
  const [channels, operatorContactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);
  const channelOf = (via: ChannelVia) => channels.find((channel) => channel.via === via && channel.active);

  const email = channelOf('email');
  const telegram = channelOf('telegram');
  const slack = channelOf('slack');
  const [telegramConnected, slackConnected] = await Promise.all([
    isChatConnected(account, telegram, operatorContactId),
    isChatConnected(account, slack, operatorContactId),
  ]);

  return [
    { via: 'email', name: 'Email', detail: email?.address ?? 'Its own email address', connected: Boolean(email) },
    { via: 'telegram', name: 'Telegram', detail: 'Its own Telegram bot', connected: telegramConnected },
    { via: 'slack', name: 'Slack', detail: 'Its own Slack app in your workspace', connected: slackConnected },
  ];
}

/**
 * A bot or app only counts once a message can travel on it: a person has written to it, or the operator
 * linked their own chat. Until then the setup isn't finished, even though the channel exists.
 */
async function isChatConnected(
  account: HumanAccount,
  channel: Channel | undefined,
  operatorContactId: string | null
): Promise<boolean> {
  if (!channel) {
    return false;
  }

  if (channel.connectedAt) {
    return true;
  }

  return operatorContactId ? hasChannelEndpoint(account, channel.identifier, operatorContactId) : false;
}
