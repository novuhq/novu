import { ChannelStepEnum } from '../../constants';
import { chatProviderSchemas } from './chat';
import { emailProviderSchemas } from './email';
import { inAppProviderSchemas } from './inApp';
import { pushProviderSchemas } from './push';
import { smsProviderSchemas } from './sms';
import { Schema } from '../../types/schema.types';

type ProviderOutputs = { output: Schema };

type ChatProviders = keyof typeof chatProviderSchemas;
type ChatProvidersSchemas = Record<ChatProviders, ProviderOutputs>;

type EmailProviders = keyof typeof emailProviderSchemas;
type EmailProvidersSchemas = Record<EmailProviders, ProviderOutputs>;

type PushProviders = keyof typeof pushProviderSchemas;
type PushProvidersSchemas = Record<PushProviders, ProviderOutputs>;

type InAppProviders = keyof typeof inAppProviderSchemas;
type InAppProvidersSchemas = Record<InAppProviders, ProviderOutputs>;

type SmsProviders = keyof typeof smsProviderSchemas;
type SmsProvidersSchemas = Record<SmsProviders, ProviderOutputs>;

type ProvidersSchemas =
  | ChatProvidersSchemas
  | EmailProvidersSchemas
  | PushProvidersSchemas
  | InAppProvidersSchemas
  | SmsProvidersSchemas;

export const providerSchemas = {
  chat: chatProviderSchemas,
  sms: smsProviderSchemas,
  email: emailProviderSchemas,
  push: pushProviderSchemas,
  in_app: inAppProviderSchemas,
} satisfies Record<ChannelStepEnum, ProvidersSchemas>;
