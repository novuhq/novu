import { Mail, Mobile, Sms } from '../../../../shared/icons';
import React from 'react';

export const channels = [
  { type: 'sms', label: 'SMS', icon: <Sms />, description: 'This is an sms' },
  { type: 'push', label: 'Push', icon: <Mobile />, description: 'This is a push' },
  { type: 'email', label: 'Email', icon: <Mail />, description: 'This is a mail' },
];

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.type === channelKey);
};
