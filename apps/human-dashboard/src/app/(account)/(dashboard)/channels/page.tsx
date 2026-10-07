import { Info } from 'lucide-react';
import type { Metadata } from 'next';

import { type ChannelRow, ChannelsTable } from '@/components/channels/channels-table';
import { CopyCliCommand } from '@/components/dashboard/copy-cli-command';
import { PageHeader } from '@/components/dashboard/page-header';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import {
  type Channel,
  type ChannelVia,
  findSlackWorkspaceName,
  hasChannelEndpoint,
  listChannels,
} from '@/lib/human-channels-api';
import { findOperatorContactId } from '@/lib/human-operator';
import { readTelegramSetup, type TelegramSetupState } from '@/lib/human-telegram-setup';

export const metadata: Metadata = {
  title: 'Channels',
};

export default async function ChannelsPage() {
  const account = await requireHumanAccount({ returnTo: '/channels' });
  const { rows, telegramSetup } = await loadChannels(account);

  return (
    <>
      <PageHeader
        title="Channels"
        description="How your agent shows up on each channel. People reply right where the message lands."
        action={<CopyCliCommand command="npx @novu/human channels" />}
      />
      <ChannelsTable rows={rows} telegramSetup={telegramSetup} />
      <p className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-xs leading-4 text-secondary">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        Every channel belongs to your agent: its own address, bot and app. One account, one agent.
      </p>
    </>
  );
}

/**
 * Email, Telegram and Slack, in that order, whether or not the agent has them yet. The Telegram setup
 * is read here too, so its drawer opens without asking the API again.
 */
async function loadChannels(account: HumanAccount): Promise<{ rows: ChannelRow[]; telegramSetup: TelegramSetupState }> {
  const [channels, operatorContactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);
  const channelOf = (via: ChannelVia) => channels.find((channel) => channel.via === via && channel.active);

  const email = channelOf('email');
  const telegram = channelOf('telegram');
  const slack = channelOf('slack');
  const [telegramConnected, slackConnected, telegramSetup, slackWorkspace] = await Promise.all([
    isChatConnected(account, telegram, operatorContactId),
    isChatConnected(account, slack, operatorContactId),
    readTelegramSetup(account, telegram, operatorContactId),
    // The name is a nicety: the row still says "Connected" when it can't be read.
    slack ? findSlackWorkspaceName(account, slack.identifier).catch(() => undefined) : undefined,
  ]);
  const botUsername = telegramSetup.step === 'create' ? '' : telegramSetup.botUsername;

  const rows: ChannelRow[] = [
    { via: 'email', name: 'Email', detail: email?.address ?? 'Its own email address', connected: Boolean(email) },
    {
      via: 'telegram',
      name: 'Telegram',
      detail: telegramConnected && botUsername ? `@${botUsername}` : 'Its own Telegram bot',
      connected: telegramConnected,
    },
    {
      via: 'slack',
      name: 'Slack',
      detail: (slackConnected && slackWorkspace) || 'Its own Slack app in your workspace',
      connected: slackConnected,
    },
  ];

  return { rows, telegramSetup };
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
