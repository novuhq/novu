import { PushProviderIdEnum } from '@novu/shared';
import { genericProviderSchemas } from '../generic';
import { PushProvidersSchemas } from '../types';

export const pushProviderSchemas: PushProvidersSchemas = {
  [PushProviderIdEnum.FCM]: genericProviderSchemas,
  [PushProviderIdEnum.APNS]: genericProviderSchemas,
  [PushProviderIdEnum.EXPO]: genericProviderSchemas,
  [PushProviderIdEnum.OneSignal]: genericProviderSchemas,
  [PushProviderIdEnum.PushWebhook]: genericProviderSchemas,
  [PushProviderIdEnum.PusherBeams]: genericProviderSchemas,
  [PushProviderIdEnum.Pushpad]: genericProviderSchemas,
};
