import { PushProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types';
import { genericProviderSchemas } from '../generic.schema';

export const pushProviderSchemas = {
  [PushProviderIdEnum.FCM]: genericProviderSchemas,
  [PushProviderIdEnum.APNS]: genericProviderSchemas,
  [PushProviderIdEnum.EXPO]: genericProviderSchemas,
  [PushProviderIdEnum.OneSignal]: genericProviderSchemas,
  [PushProviderIdEnum.PushWebhook]: genericProviderSchemas,
  [PushProviderIdEnum.PusherBeams]: genericProviderSchemas,
  [PushProviderIdEnum.Pushpad]: genericProviderSchemas,
} satisfies Record<PushProviderIdEnum, { output: Schema }>;
