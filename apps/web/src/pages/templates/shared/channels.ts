import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import { ChannelTypeEnum } from '@novu/shared';
import { Digest } from '../../../design-system/icons/general/Digest';

export const channels = [
  {
    tabKey: ChannelTypeEnum.IN_APP,
    label: 'In-App',
    description: 'Send notifications to the in-app notification center',
    Icon: MobileGradient,
    testId: 'inAppSelector',
    channelType: ChannelTypeEnum.IN_APP,
    action: false,
  },
  {
    tabKey: ChannelTypeEnum.EMAIL,
    label: 'Email',
    description: 'Send using one of our email integrations',
    Icon: MailGradient,
    testId: 'emailSelector',
    channelType: ChannelTypeEnum.EMAIL,
    action: false,
  },
  {
    tabKey: ChannelTypeEnum.SMS,
    label: 'SMS',
    description: "Send an SMS directly to the user's phone",
    Icon: SmsGradient,
    testId: 'smsSelector',
    channelType: ChannelTypeEnum.SMS,
    action: false,
  },
  {
    tabKey: ChannelTypeEnum.DIGEST,
    label: 'Digest',
    description: 'This sub title will describe things',
    Icon: Digest,
    testId: 'digestBackoffSelector',
    channelType: ChannelTypeEnum.DIGEST,
    action: true,
  },
];

export const getChannel = (channelKey: string) => {
  return channels.find((channel) => channel.tabKey === channelKey);
};
