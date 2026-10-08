import { currentUser } from '@clerk/nextjs/server';
import { Info } from 'lucide-react';
import type { Metadata } from 'next';

import { type ChannelRow, ChannelsTable } from '@/components/channels/channels-table';
import { CopyCliCommand } from '@/components/dashboard/copy-cli-command';
import { PageHeader } from '@/components/dashboard/page-header';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName, getRelayAgent } from '@/lib/human-agent-api';
import { type ChannelVia, listChannels, slackAgentHandle } from '@/lib/human-channels-api';
import { findOperatorContactId } from '@/lib/human-operator';
import { readSlackSetup, type SlackSetupState } from '@/lib/human-slack-setup';
import { readTelegramSetup, type TelegramSetupState } from '@/lib/human-telegram-setup';

export const metadata: Metadata = {
  title: 'Channels',
};

/** The table doesn't wait longer than this for a channel's setup; its drawer then reads it when it opens. */
const SETUP_TIMEOUT_MS = 4000;

type LoadedChannels = {
  rows: ChannelRow[];
  telegramSetup: TelegramSetupState;
  slackSetup: SlackSetupState;
  /** What the agent is called, such as "Dima’s assistant". Missing when it has no name to go by. */
  agentName?: string;
};

export default async function ChannelsPage() {
  const account = await requireHumanAccount({ returnTo: '/channels' });
  const { rows, telegramSetup, slackSetup, agentName } = await loadChannels(account);

  return (
    <>
      <PageHeader
        title="Channels"
        description="How your agent shows up on each channel. People reply right where the message lands."
        action={<CopyCliCommand command="npx @novu/human channels" />}
      />
      <ChannelsTable rows={rows} telegramSetup={telegramSetup} slackSetup={slackSetup} agentName={agentName} />
      <p className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-xs leading-4 text-secondary">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        Every channel belongs to your agent: its own address, bot and app. One account, one agent.
      </p>
    </>
  );
}

/**
 * Email, Telegram and Slack, in that order, whether or not the agent has them yet. The Telegram and
 * Slack setups are read here too, so their drawers open without asking the API again.
 */
async function loadChannels(account: HumanAccount): Promise<LoadedChannels> {
  const [channels, operatorContactId, agentName] = await Promise.all([
    listChannels(account),
    findOperatorContactId(account),
    // Only wording depends on the name, so the page does without it when it can't be read.
    loadAgentName(account).catch(() => undefined),
  ]);
  const channelOf = (via: ChannelVia) => channels.find((channel) => channel.via === via && channel.active);

  const email = channelOf('email');
  const telegram = channelOf('telegram');
  const slack = channelOf('slack');
  const telegramConnected = telegram?.connected === true;
  const slackConnected = slack?.connected === true;
  const [telegramSetup, slackSetup] = await Promise.all([
    withinTime<TelegramSetupState>(readTelegramSetup(account, telegram, operatorContactId)),
    withinTime<SlackSetupState>(readSlackSetup(account, slack, operatorContactId)),
  ]);
  // The workspace's name is a nicety: the row still says "Connected" when it couldn't be read.
  const slackWorkspace = slackSetup.step === 'connected' ? slackSetup.workspace : undefined;
  const botUsername = 'botUsername' in telegramSetup ? telegramSetup.botUsername : '';
  const slackHandle = slack && slackAgentHandle(slack);

  const rows: ChannelRow[] = [
    {
      via: 'email',
      name: 'Email',
      placeholder: 'Its own email address',
      handles: email?.address ? [{ value: email.address, label: 'email address' }] : [],
      connected: Boolean(email),
    },
    {
      via: 'telegram',
      name: 'Telegram',
      placeholder: 'Its own Telegram bot',
      handles: telegramConnected && botUsername ? [{ value: `@${botUsername}`, label: 'bot handle' }] : [],
      connected: telegramConnected,
    },
    {
      via: 'slack',
      name: 'Slack',
      placeholder: 'Its own Slack app in your workspace',
      handles: slackConnected
        ? [
            ...(slackWorkspace ? [{ value: slackWorkspace, label: 'workspace' }] : []),
            ...(slackHandle ? [{ value: slackHandle, label: 'agent handle' }] : []),
          ]
        : [],
      connected: slackConnected,
    },
  ];

  return { rows, telegramSetup, slackSetup, agentName };
}

async function loadAgentName(account: HumanAccount): Promise<string | undefined> {
  const [agent, user] = await Promise.all([getRelayAgent(account), currentUser()]);

  return agent ? agentDisplayName(agent, user?.firstName) : undefined;
}

/**
 * Reading a setup can hang (Telegram's asks Telegram who the bot is); the page settles for `unknown`
 * instead.
 */
function withinTime<State extends { step: string }>(setup: Promise<State>): Promise<State | { step: 'unknown' }> {
  return Promise.race([
    setup,
    new Promise<{ step: 'unknown' }>((resolve) => {
      setTimeout(() => resolve({ step: 'unknown' }), SETUP_TIMEOUT_MS);
    }),
  ]);
}
