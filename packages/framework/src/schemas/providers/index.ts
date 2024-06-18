import { ChannelStepEnum } from '../../constants';
import { chatProviderSchemas } from './chat';
import { emailProviderSchemas } from './email';
import { inAppProviderSchemas } from './inApp';
import { pushProviderSchemas } from './push';
import { smsProviderSchemas } from './sms';

export const providerSchemas = {
  chat: chatProviderSchemas,
  sms: smsProviderSchemas,
  email: emailProviderSchemas,
  push: pushProviderSchemas,
  in_app: inAppProviderSchemas,
} as const satisfies Record<ChannelStepEnum, any>;
