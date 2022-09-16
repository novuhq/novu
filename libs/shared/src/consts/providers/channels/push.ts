import { ChannelTypeEnum } from '../../../entities/message-template';
import { fcmConfig, expoConfig } from '../credentials';
import { PushProviderIdEnum } from '../provider.enum';
import { IProviderConfig } from '../provider.interface';

export const pushProviders: IProviderConfig[] = [
  {
    id: PushProviderIdEnum.FCM,
    displayName: 'Firebase Cloud Messaging',
    channel: ChannelTypeEnum.PUSH,
    credentials: fcmConfig,
    docReference: 'https://docs.novu.co/channels/push#firebase-cloud-messages',
    logoFileName: { light: 'fcm.svg', dark: 'fcm.svg' },
  },
  {
    id: PushProviderIdEnum.EXPO,
    displayName: 'Expo Push',
    channel: ChannelTypeEnum.PUSH,
    credentials: expoConfig,
    docReference: 'https://docs.expo.dev/push-notifications/overview/',
    logoFileName: { light: 'expo.svg', dark: 'expo.svg' },
  },
];
