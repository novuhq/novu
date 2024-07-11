import { PushProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types';
import { genericProviderSchemas } from '../generic.schema';
import { apnsProviderSchemas } from './apns.schema';
import { expoProviderSchemas } from './expo.schema';
import { fcmProviderSchemas } from './fcm.schema';
import { oneSignalProviderSchema } from './one-signal.schema';

export const pushProviderSchemas = {
  [PushProviderIdEnum.FCM]: fcmProviderSchemas,
  [PushProviderIdEnum.APNS]: apnsProviderSchemas,
  [PushProviderIdEnum.EXPO]: expoProviderSchemas,
  [PushProviderIdEnum.OneSignal]: oneSignalProviderSchema,
  [PushProviderIdEnum.PushWebhook]: genericProviderSchemas,
  [PushProviderIdEnum.PusherBeams]: genericProviderSchemas,
  [PushProviderIdEnum.Pushpad]: genericProviderSchemas,
} satisfies Record<PushProviderIdEnum, { output: Schema }>;
