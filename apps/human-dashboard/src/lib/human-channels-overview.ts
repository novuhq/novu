import 'server-only';

import type { ChannelRow } from '@/components/channels/channels-table';

import type { HumanAccount } from './human-account';
import { type ChannelVia, listChannels, slackAgentHandle } from './human-channels-api';
import { findOperatorContactId } from './human-operator';
import { readSlackSetup, type SlackSetupState } from './human-slack-setup';
import { readTelegramSetup, type TelegramSetupState } from './human-telegram-setup';

/** A page doesn't wait longer than this for a channel's setup; its drawer then reads it when it opens. */
const SETUP_TIMEOUT_MS = 4000;

type ChannelLabels = Pick<ChannelRow, 'via' | 'name' | 'placeholder'>;

const EMAIL: ChannelLabels = { via: 'email', name: 'Email', placeholder: 'Its own email address' };
const TELEGRAM: ChannelLabels = { via: 'telegram', name: 'Telegram', placeholder: 'Its own Telegram bot' };
const SLACK: ChannelLabels = { via: 'slack', name: 'Slack', placeholder: 'Its own Slack app in your workspace' };

export type ChannelsOverview = {
  rows: ChannelRow[];
  telegramSetup: TelegramSetupState;
  slackSetup: SlackSetupState;
};

/**
 * Email, Telegram and Slack, in that order, whether or not the agent has them yet. The Telegram and
 * Slack setups are read here too, so their drawers open without asking the API again.
 */
export async function loadChannelsOverview(account: HumanAccount): Promise<ChannelsOverview> {
  const [channels, operatorContactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);
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
      ...EMAIL,
      handles: email?.address ? [{ value: email.address, label: 'email address' }] : [],
      connected: Boolean(email),
    },
    {
      ...TELEGRAM,
      handles: telegramConnected && botUsername ? [{ value: `@${botUsername}`, label: 'bot handle' }] : [],
      connected: telegramConnected,
    },
    {
      ...SLACK,
      handles: slackConnected
        ? [
            ...(slackWorkspace ? [{ value: slackWorkspace, label: 'workspace' }] : []),
            ...(slackHandle ? [{ value: slackHandle, label: 'agent handle' }] : []),
          ]
        : [],
      connected: slackConnected,
    },
  ];

  return { rows, telegramSetup, slackSetup };
}

/**
 * The same three channels for an account whose agent isn't set up yet: none of them exists, and there
 * is nothing to ask the API for.
 */
export function channelsBeforeSetup(): ChannelsOverview {
  return {
    rows: [EMAIL, TELEGRAM, SLACK].map((channel) => ({ ...channel, handles: [], connected: false })),
    telegramSetup: { step: 'create' },
    slackSetup: { step: 'name' },
  };
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
