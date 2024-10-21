import { PushProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { apnsProviderSchemas } from './apns.schema';
import { expoProviderSchemas } from './expo.schema';
import { fcmProviderSchemas } from './fcm.schema';
import { oneSignalProviderSchema } from './one-signal.schema';

export const pushProviderSchemas = {
  [PushProviderIdEnum.APNS]: apnsProviderSchemas,
  [PushProviderIdEnum.EXPO]: expoProviderSchemas,
  [PushProviderIdEnum.FCM]: fcmProviderSchemas,
  [PushProviderIdEnum.OneSignal]: oneSignalProviderSchema,
  [PushProviderIdEnum.PusherBeams]: genericProviderSchemas,
  [PushProviderIdEnum.Pushpad]: genericProviderSchemas,
  [PushProviderIdEnum.PushWebhook]: genericProviderSchemas,
} satisfies Record<PushProviderIdEnum, { output: Schema }>;
