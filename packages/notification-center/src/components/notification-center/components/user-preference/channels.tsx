import { Bell, Direct, Mail, Mobile, Sms } from '../../../../shared/icons';
import React from 'react';

export const channels = [
  { type: 'sms', label: 'SMS', Icon: Sms, description: 'This is an sms' },
  { type: 'push', label: 'Push', Icon: Mobile, description: 'This is a push' },
  { type: 'email', label: 'Email', Icon: Mail, description: 'This is a mail' },
  { type: 'in_app', label: 'In App', Icon: Bell, description: 'This is an in app' },
  { type: 'direct', label: 'Direct', Icon: Direct, description: 'This is a direct' },
];

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.type === channelKey);
};
