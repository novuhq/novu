import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import { ChannelTypeEnum } from '@novu/shared';

export const channels = [
  {
    tabKey: ChannelTypeEnum.IN_APP,
    label: 'In-App',
    description: 'Send notifications to the in-app notification center',
    Icon: MobileGradient,
    testId: 'inAppSelector',
    channelType: ChannelTypeEnum.IN_APP,
  },
  {
    tabKey: ChannelTypeEnum.EMAIL,
    label: 'Email',
    description: 'Send using one of our email integrations',
    Icon: MailGradient,
    testId: 'emailSelector',
    channelType: ChannelTypeEnum.EMAIL,
  },
  {
    tabKey: ChannelTypeEnum.SMS,
    label: 'SMS',
    description: "Send an SMS directly to the user's phone",
    Icon: SmsGradient,
    testId: 'smsSelector',
    channelType: ChannelTypeEnum.SMS,
  },
  {
    tabKey: ChannelTypeEnum.DIRECT,
    label: 'Direct',
    description: 'Send an direct messages',
    Icon: SmsGradient,
    testId: 'directSelector',
    channelType: ChannelTypeEnum.DIRECT,
  },
];

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.tabKey === channelKey);
};
