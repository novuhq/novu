import {
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  ProvidersIdEnum,
  SmsProviderIdEnum,
} from '../../types';
import { chatProviders, emailProviders, inAppProviders, pushProviders, smsProviders, toolProviders } from './channels';
import { IProviderConfig } from './provider.interface';

export {
  chatProviders,
  emailProviders,
  inAppProviders,
  pushProviders,
  smsProviders,
  toolProviders,
} from './channels';

export const providers: IProviderConfig[] = [
  ...emailProviders,
  ...smsProviders,
  ...chatProviders,
  ...pushProviders,
  ...inAppProviders,
  ...toolProviders,
];

export const NOVU_PROVIDERS: ProvidersIdEnum[] = [
  InAppProviderIdEnum.Novu,
  SmsProviderIdEnum.Novu,
  EmailProviderIdEnum.Novu,
  EmailProviderIdEnum.NovuAgent,
  ChatProviderIdEnum.Novu,
  ChatProviderIdEnum.NovuWeb,
  AgentRuntimeProviderIdEnum.NovuAnthropic,
];

export const NOVU_SMS_EMAIL_PROVIDERS: ProvidersIdEnum[] = [SmsProviderIdEnum.Novu, EmailProviderIdEnum.Novu];

export const PROVIDER_ID_TO_CHANNEL_MAP: Record<string, ChannelTypeEnum> = Object.fromEntries(
  providers.map((p) => [p.id, p.channel])
);
