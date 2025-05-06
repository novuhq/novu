import {
  apnsConfig,
  expoConfig,
  fcmConfig,
  oneSignalConfig,
  pusherBeamsConfig,
  pushpadConfig,
  pushWebhookConfig,
} from '../credentials';
import { IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum, PushProviderIdEnum } from '../../../types';
import { UTM_CAMPAIGN_QUERY_PARAM } from '../../../ui';

export const pushProviders: IProviderConfig[] = [
  {
    id: PushProviderIdEnum.OneSignal,
    displayName: 'OneSignal',
    channel: ChannelTypeEnum.PUSH,
    credentials: oneSignalConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/onesignal${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'one-signal.svg', dark: 'one-signal.svg' },
  },
  {
    id: PushProviderIdEnum.Pushpad,
    displayName: 'Pushpad',
    channel: ChannelTypeEnum.PUSH,
    credentials: pushpadConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/pushpad${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'pushpad.svg', dark: 'pushpad.svg' },
  },
  {
    id: PushProviderIdEnum.FCM,
    displayName: 'Firebase Cloud Messaging',
    channel: ChannelTypeEnum.PUSH,
    credentials: fcmConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/fcm${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'fcm.svg', dark: 'fcm.svg' },
  },
  {
    id: PushProviderIdEnum.EXPO,
    displayName: 'Expo Push',
    channel: ChannelTypeEnum.PUSH,
    credentials: expoConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/expo-push${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'expo.svg', dark: 'expo.svg' },
  },
  {
    id: PushProviderIdEnum.APNS,
    displayName: 'APNs',
    channel: ChannelTypeEnum.PUSH,
    credentials: apnsConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/apns${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'apns.png', dark: 'apns.png' },
    betaVersion: true,
  },
  {
    id: PushProviderIdEnum.PushWebhook,
    displayName: 'Push Webhook',
    channel: ChannelTypeEnum.PUSH,
    credentials: pushWebhookConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/push-webhook${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'push-webhook.svg', dark: 'push-webhook.svg' },
    betaVersion: true,
  },
  {
    id: PushProviderIdEnum.PusherBeams,
    displayName: 'Pusher Beams',
    channel: ChannelTypeEnum.PUSH,
    credentials: pusherBeamsConfig,
    docReference: `https://docs.novu.co/channels-and-providers/push/pusher-beams${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'pusher-beams.svg', dark: 'pusher-beams.svg' },
  },
];
