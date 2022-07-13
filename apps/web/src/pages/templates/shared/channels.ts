import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import { ChannelTypeEnum } from '@novu/shared';
import { Digest } from '../../../design-system/icons/general/Digest';

export enum StepTypeEnum {
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
    channelType: ChannelTypeEnum.IN_APP,
    type: StepTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.EMAIL,
    label: 'Email',
    description: 'Send using one of our email integrations',
    Icon: MailGradient,
    testId: 'emailSelector',
    channelType: ChannelTypeEnum.EMAIL,
    type: StepTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.SMS,
    label: 'SMS',
    description: "Send an SMS directly to the user's phone",
    Icon: SmsGradient,
    testId: 'smsSelector',
    channelType: ChannelTypeEnum.SMS,
    type: StepTypeEnum.CHANNEL,
  },
  {
    tabKey: ChannelTypeEnum.DIGEST,
    label: 'Digest',
    description: 'Aggregate events triggered to one notification',
    Icon: Digest,
    testId: 'digestSelector',
    channelType: ChannelTypeEnum.DIGEST,
    type: StepTypeEnum.ACTION,
  },
];

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.tabKey === channelKey);
};
