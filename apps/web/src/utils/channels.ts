import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import React from 'react';
import {
  ChatFilled,
  DelayAction,
  DigestAction,
  EmailFilled,
  InAppFilled,
  PushFilled,
  SmsFilled,
} from '@novu/design-system';

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

export const CHANNEL_TYPE_TO_STRING: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-App',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
};

export const channels: IChannelDefinition[] = [
  {
    tabKey: ChannelTypeEnum.IN_APP,
    label: 'In-App',
    description: 'Send notifications to the in-app notification center',
    Icon: InAppFilled,
    testId: 'inAppSelector',
    channelType: StepTypeEnum.IN_APP,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.EMAIL,
    label: 'Email',
    description: 'Send using one of our email integrations',
    Icon: EmailFilled,
    testId: 'emailSelector',
    channelType: StepTypeEnum.EMAIL,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.SMS,
    label: 'SMS',
    description: "Send an SMS directly to the user's phone",
    Icon: SmsFilled,
    testId: 'smsSelector',
    channelType: StepTypeEnum.SMS,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: StepTypeEnum.DIGEST,
    label: 'Digest',
    description: 'Aggregate events triggered to one notification',
    Icon: DigestAction,
    testId: 'digestSelector',
    channelType: StepTypeEnum.DIGEST,
    type: NodeTypeEnum.ACTION,
  },
  {
    tabKey: StepTypeEnum.DELAY,
    label: 'Delay',
    description: 'Delay before trigger of next event',
    Icon: DelayAction,
    testId: 'delaySelector',
    channelType: StepTypeEnum.DELAY,
    type: NodeTypeEnum.ACTION,
  },
  {
    tabKey: ChannelTypeEnum.CHAT,
    label: 'Chat',
    description: 'Send a chat message',
    Icon: ChatFilled,
    testId: 'chatSelector',
    channelType: StepTypeEnum.CHAT,
    type: NodeTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.PUSH,
    label: 'Push',
    description: "Send an Push Notification to a user's device",
    Icon: PushFilled,
    testId: 'pushSelector',
    channelType: StepTypeEnum.PUSH,
    type: NodeTypeEnum.CHANNEL,
  },
];

export const getChannel = (channelKey?: string): IChannelDefinition | undefined => {
  return channels.find((channel) => channel.tabKey === channelKey);
};
