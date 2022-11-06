import { h } from '@stencil/core';

import { IPreferenceChannels } from '../types';

export const channels = [
  { type: 'sms', label: 'SMS', icon: () => <sms-icon width="30px" height="30px" />, description: 'This is an sms' },
  {
    type: 'push',
    label: 'Push',
    icon: () => <mobile-icon width="30px" height="30px" />,
    description: 'This is a push',
  },
  {
    type: 'email',
    label: 'Email',
    icon: () => <email-icon width="30px" height="30px" />,
    description: 'This is a mail',
  },
  {
    type: 'in_app',
    label: 'In App',
    icon: () => <bell-icon width="30px" height="30px" />,
    description: 'This is an in app',
  },
  { type: 'chat', label: 'Chat', icon: () => <chat-icon width="30px" height="30px" />, description: 'This is a chat' },
];

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.type === channelKey);
};

export const getEnabledChannels = (preferenceChannels: IPreferenceChannels) => {
  const keys = Object.keys(preferenceChannels);
  const list = keys.filter((key) => preferenceChannels[key]).map((channel) => getChannel(channel).label);

  return list.join(', ');
};
