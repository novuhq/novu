import { ChannelStepEnum } from '../../constants';
import type { JsonSchema } from '../../types/schema.types';
import { chatProviderSchemas } from './chat';
import { emailProviderSchemas } from './email';
import { inAppProviderSchemas } from './inApp';
import { pushProviderSchemas } from './push';
import { signalsProviderSchemas } from './signals';
import { smsProviderSchemas } from './sms';

export const providerSchemas = {
  chat: chatProviderSchemas,
  sms: smsProviderSchemas,
  email: emailProviderSchemas,
  push: pushProviderSchemas,
  in_app: inAppProviderSchemas,
  signals: signalsProviderSchemas,
} as const satisfies Record<ChannelStepEnum, Record<string, { output: JsonSchema }>>;
