import 'server-only';

import type { HumanAccount } from './human-account';
import { type ChannelVia, listChannels, slackAgentHandle } from './human-channels-api';
import { findOperatorContactId } from './human-operator';
import { readSlackSetup, type SlackSetupState } from './human-slack-setup';
import { readTelegramSetup, type TelegramSetupState } from './human-telegram-setup';
import { readWhatsAppSetup, type WhatsAppSetupState } from './human-whatsapp-setup';

export type ChannelRow = {
  via: ChannelVia;
  name: string;
  /** How the agent is known on the channel once it's connected. Each one can be copied on its own. */
  handles: ChannelHandle[];
  connected: boolean;
};

export type ChannelHandle = {
  value: string;
  /** What the value is, for the copy button: "bot handle", "workspace". */
  label: string;
};

/** A page doesn't wait longer than this for a channel's setup; its drawer then reads it when it opens. */
const SETUP_TIMEOUT_MS = 4000;

type ChannelLabels = Pick<ChannelRow, 'via' | 'name'>;

const EMAIL: ChannelLabels = { via: 'email', name: 'Email' };
const TELEGRAM: ChannelLabels = { via: 'telegram', name: 'Telegram' };
const SLACK: ChannelLabels = { via: 'slack', name: 'Slack' };
const WHATSAPP: ChannelLabels = { via: 'whatsapp', name: 'WhatsApp' };

export type ChannelsOverview = {
  rows: ChannelRow[];
  telegramSetup: TelegramSetupState;
  slackSetup: SlackSetupState;
  /** `hidden` while WhatsApp isn't offered to this account; then there is no WhatsApp row either. */
  whatsappSetup: WhatsAppSetupState;
};

/**
 * Email, Telegram and Slack, in that order, whether or not the agent has them yet, then WhatsApp where it is
 * offered. Each setup is read here too, so its drawer opens without asking the API again.
 */
export async function loadChannelsOverview(account: HumanAccount): Promise<ChannelsOverview> {
  const [channels, operatorContactId] = await Promise.all([listChannels(account), findOperatorContactId(account)]);
  const channelOf = (via: ChannelVia) => channels.find((channel) => channel.via === via && channel.active);

  const email = channelOf('email');
  const telegram = channelOf('telegram');
  const slack = channelOf('slack');
  const telegramConnected = telegram?.connected === true;
  const slackConnected = slack?.connected === true;
  const [telegramSetup, slackSetup, whatsappSetup] = await Promise.all([
    withinTime<TelegramSetupState>(readTelegramSetup(account, telegram, operatorContactId)),
    withinTime<SlackSetupState>(readSlackSetup(account, slack, operatorContactId)),
    withinTime<WhatsAppSetupState>(readWhatsAppSetup(account)),
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
    ...whatsAppRows(whatsappSetup),
  ];

  return { rows, telegramSetup, slackSetup, whatsappSetup };
}

/**
 * No row while WhatsApp isn't offered, or while that couldn't be read: the channel is behind a flag, so it
 * stays out unless the API says it's there. Otherwise connected once the operator's own number is bound to
 * the business number, as Telegram is once they said hi to the bot.
 */
export function whatsAppRows(setup: WhatsAppSetupState): ChannelRow[] {
  if (setup.step === 'hidden' || setup.step === 'unknown') {
    return [];
  }

  const number = setup.step === 'connected' || setup.step === 'verify' ? setup.displayPhoneNumber : undefined;

  return [
    {
      ...WHATSAPP,
      handles: number ? [{ value: number, label: 'business number' }] : [],
      connected: setup.step === 'connected',
    },
  ];
}

/**
 * Reading a setup can hang (Telegram's asks Telegram who the bot is); the page settles for `unknown`
 * instead.
 */
export function withinTime<State extends { step: string }>(
  setup: Promise<State>
): Promise<State | { step: 'unknown' }> {
  return Promise.race([
    setup,
    new Promise<{ step: 'unknown' }>((resolve) => {
      setTimeout(() => resolve({ step: 'unknown' }), SETUP_TIMEOUT_MS);
    }),
  ]);
}
