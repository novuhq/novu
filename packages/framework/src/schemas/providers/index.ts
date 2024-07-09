import { ChannelStepEnum } from '../../constants';
import { chatProviderSchemas } from './chat';
import { emailProviderSchemas } from './email';
import { inAppProviderSchemas } from './inApp';
import { pushProviderSchemas } from './push';
import { smsProviderSchemas } from './sms';
import { ProvidersSchemas } from './types';

export const providerSchemas = {
  [ChannelStepEnum.CHAT]: chatProviderSchemas,
  [ChannelStepEnum.SMS]: smsProviderSchemas,
  [ChannelStepEnum.EMAIL]: emailProviderSchemas,
  [ChannelStepEnum.PUSH]: pushProviderSchemas,
  [ChannelStepEnum.IN_APP]: inAppProviderSchemas,
} satisfies Record<ChannelStepEnum, ProvidersSchemas>;
