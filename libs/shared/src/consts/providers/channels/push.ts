import { ChannelTypeEnum } from '../../../entities/message-template';
import { fcmConfig } from '../provider-credentials';
import { IProviderConfig } from '../provider.interface';

export const pushProviders: IProviderConfig[] = [
  {
    id: 'fcm',
    displayName: 'Firebase Cloud Messaging',
    channel: ChannelTypeEnum.PUSH,
    credentials: fcmConfig,
    docReference: 'https://docs.novu.co/channels/push#firebase-cloud-messages',
    logoFileName: { light: 'fcm.svg', dark: 'fcm.svg' },
  },
];
