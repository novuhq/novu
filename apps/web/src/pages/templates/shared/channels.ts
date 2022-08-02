import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { DigestGradient } from '../../../design-system/icons/general/DigestGradient';

export enum NodeTypeEnum {
  CHANNEL = 'channel',
  ACTION = 'action',
}

export const channels = [
  {
    tabKey: ChannelTypeEnum.IN_APP,
    label: 'In-App',
    description: 'Send notifications to the in-app notification center',
    Icon: MobileGradient,
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
    tabKey: ChannelTypeEnum.DIRECT,
    label: 'Direct',
    description: 'Send a direct message',
    Icon: SmsGradient,
    testId: 'directSelector',
    channelType: StepTypeEnum.DIRECT,
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

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.tabKey === channelKey);
};
