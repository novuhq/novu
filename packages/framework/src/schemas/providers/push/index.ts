import { PushProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { apnsProviderSchemas } from './apns.schema';
import { expoProviderSchemas } from './expo.schema';
import { fcmProviderSchemas } from './fcm.schema';
import { oneSignalProviderSchema } from './one-signal.schema';

export const pushProviderSchemas = {
  apns: apnsProviderSchemas,
  expo: expoProviderSchemas,
  fcm: fcmProviderSchemas,
  'one-signal': oneSignalProviderSchema,
  'pusher-beams': genericProviderSchemas,
  pushpad: genericProviderSchemas,
  'push-webhook': genericProviderSchemas,
} as const satisfies Record<PushProviderIdEnum, { output: JsonSchema }>;
