import { ChannelTypeEnum } from '../../../entities/message-template';
import { apnsConfig, fcmConfig } from '../credentials';
import { PushProviderIdEnum } from '../provider.enum';
import { IProviderConfig } from '../provider.interface';

export const pushProviders: IProviderConfig[] = [
  {
    id: PushProviderIdEnum.FCM,
    displayName: 'Firebase Cloud Messaging',
    channel: ChannelTypeEnum.PUSH,
    credentials: fcmConfig,
    docReference: 'https://docs.novu.co/channels/push/fcm',
    logoFileName: { light: 'fcm.svg', dark: 'fcm.svg' },
  },
  {
    id: PushProviderIdEnum.APNS,
    displayName: 'APNs',
    channel: ChannelTypeEnum.PUSH,
    credentials: apnsConfig,
    docReference: 'https://docs.novu.co/channels/push/apns',
    logoFileName: { light: 'apns.png', dark: 'apns.png' },
    betaVersion: true,
  },
];
