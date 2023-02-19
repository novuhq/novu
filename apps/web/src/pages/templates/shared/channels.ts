import {
  BellGradient,
  ChatGradient,
  MailGradient,
  MobileGradient,
  SmsGradient,
  TimerGradient,
} from '../../../design-system/icons';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { DigestGradient } from '../../../design-system/icons/general/DigestGradient';
import React from 'react';

export enum NodeTypeEnum {
  CHANNEL = 'channel',
  ACTION = 'action',
}

interface IChannelDefinition {
  tabKey: StepTypeEnum | ChannelTypeEnum;
  label: string;
  description: string;
  Icon: React.FC<any>;
  testId: string;
  channelType: StepTypeEnum;
  type: NodeTypeEnum;
}

export const channels: IChannelDefinition[] = [
  {
    tabKey: ChannelTypeEnum.IN_APP,
    label: 'In-App',
    description: 'Send notifications to the in-app notification center',
    Icon: BellGradient,
    testId: 'inAppSelector',
    channelType: StepTypeEnum.IN_APP,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.EMAIL,
    label: 'Email',
    description: 'Send using one of our email integrations',
    Icon: MailGradient,
    testId: 'emailSelector',
    channelType: StepTypeEnum.EMAIL,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.SMS,
    label: 'SMS',
    description: "Send an SMS directly to the user's phone",
    Icon: SmsGradient,
    testId: 'smsSelector',
    channelType: StepTypeEnum.SMS,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: StepTypeEnum.DIGEST,
    label: 'Digest',
    description: 'Aggregate events triggered to one notification',
    Icon: DigestGradient,
    testId: 'digestSelector',
    channelType: StepTypeEnum.DIGEST,
    type: NodeTypeEnum.ACTION,
  },
  {
    tabKey: StepTypeEnum.DELAY,
    label: 'Delay',
    description: 'Delay before trigger of next event',
    Icon: TimerGradient,
    testId: 'delaySelector',
    channelType: StepTypeEnum.DELAY,
    type: NodeTypeEnum.ACTION,
  },
  {
    tabKey: ChannelTypeEnum.CHAT,
    label: 'Chat',
    description: 'Send a chat message',
    Icon: ChatGradient,
    testId: 'chatSelector',
    channelType: StepTypeEnum.CHAT,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.PUSH,
    label: 'Push',
    description: "Send an Push Notification to a user's device",
    Icon: MobileGradient,
    testId: 'pushSelector',
    channelType: StepTypeEnum.PUSH,
    type: NodeTypeEnum.CHANNEL,
  },
];

export const getChannel = (channelKey: string): IChannelDefinition | undefined => {
  return channels.find((channel) => channel.tabKey === channelKey);
};
