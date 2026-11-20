import { channelDisplayName } from './dashboard-urls';
import type { ChannelChoice } from './types';

export type ConnectChannelPickerOption = {
  label: string;
  value: ChannelChoice;
};

/** Single source for the interactive channel picker — keep values unique. */
export const CONNECT_CHANNEL_PICKER_OPTIONS: readonly ConnectChannelPickerOption[] = [
  { label: 'Slack (recommended)', value: 'slack' },
  { label: 'Telegram', value: 'telegram' },
  { label: channelDisplayName('email'), value: 'email' },
  { label: channelDisplayName('sendblue'), value: 'sendblue' },
  { label: channelDisplayName('whatsapp'), value: 'whatsapp' },
  { label: channelDisplayName('web-chat'), value: 'web-chat' },
  { label: channelDisplayName('teams'), value: 'teams' },
  { label: 'Skip — set up later in dashboard', value: 'skip' },
];
