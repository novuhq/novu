import {
  apnsConfig,
  expoConfig,
  fcmConfig,
  oneSignalConfig,
  pusherBeamsConfig,
  pushpadConfig,
  pushWebhookConfig,
} from '../credentials';

import { PushProviderIdEnum } from '../provider.enum';
import { IProviderConfig } from '../provider.interface';

import { ChannelTypeEnum } from '../../../types';

export const pushProviders: IProviderConfig[] = [
  {
    id: PushProviderIdEnum.OneSignal,
    displayName: 'OneSignal',
    channel: ChannelTypeEnum.PUSH,
    credentials: oneSignalConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/onesignal',
    logoFileName: { light: 'one-signal.svg', dark: 'one-signal.svg' },
  },
  {
    id: PushProviderIdEnum.Pushpad,
    displayName: 'Pushpad',
    channel: ChannelTypeEnum.PUSH,
    credentials: pushpadConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/pushpad',
    logoFileName: { light: 'pushpad.svg', dark: 'pushpad.svg' },
  },
  {
    id: PushProviderIdEnum.FCM,
    displayName: 'Firebase Cloud Messaging',
    channel: ChannelTypeEnum.PUSH,
    credentials: fcmConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/fcm',
    logoFileName: { light: 'fcm.svg', dark: 'fcm.svg' },
  },
  {
    id: PushProviderIdEnum.EXPO,
    displayName: 'Expo Push',
    channel: ChannelTypeEnum.PUSH,
    credentials: expoConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/expo-push',
    logoFileName: { light: 'expo.svg', dark: 'expo.svg' },
  },
  {
    id: PushProviderIdEnum.APNS,
    displayName: 'APNs',
    channel: ChannelTypeEnum.PUSH,
    credentials: apnsConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/apns',
    logoFileName: { light: 'apns.png', dark: 'apns.png' },
    betaVersion: true,
  },
  {
    id: PushProviderIdEnum.PushWebhook,
    displayName: 'Push Webhook',
    channel: ChannelTypeEnum.PUSH,
    credentials: pushWebhookConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/push-webhook',
    logoFileName: { light: 'push-webhook.svg', dark: 'push-webhook.svg' },
    betaVersion: true,
  },
  {
    id: PushProviderIdEnum.PusherBeams,
    displayName: 'Pusher Beams',
    channel: ChannelTypeEnum.PUSH,
    credentials: pusherBeamsConfig,
    docReference: 'https://docs.novu.co/channels-and-providers/push/pusher-beams',
    logoFileName: { light: 'pusher-beams.svg', dark: 'pusher-beams.svg' },
  },
];
