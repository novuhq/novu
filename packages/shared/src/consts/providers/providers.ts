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
  EmailProviderIdEnum.AgentEmailInbox,
  ChatProviderIdEnum.Novu,
  ChatProviderIdEnum.NovuWebChat,
  ChatProviderIdEnum.AgentVoiceCall,
  AgentRuntimeProviderIdEnum.NovuAnthropic,
];

export const NOVU_SMS_EMAIL_PROVIDERS: ProvidersIdEnum[] = [SmsProviderIdEnum.Novu, EmailProviderIdEnum.Novu];

/**
 * Agent Inbox providers kept out of workflow integration pickers.
 * `novu-email-agent` and `agent-email-inbox` share the `{slug}-{routingKey}@domain`
 * address. `agent-voice-call` is the Human voice channel and holds no address.
 */
export const AGENT_INBOX_PROVIDER_IDS = [
  EmailProviderIdEnum.NovuAgent,
  EmailProviderIdEnum.AgentEmailInbox,
  ChatProviderIdEnum.AgentVoiceCall,
] as const;

export type AgentInboxProviderId = (typeof AGENT_INBOX_PROVIDER_IDS)[number];

export function isAgentInboxProvider(providerId: string): boolean {
  return (AGENT_INBOX_PROVIDER_IDS as readonly string[]).includes(providerId);
}

export const PROVIDER_ID_TO_CHANNEL_MAP: Record<string, ChannelTypeEnum> = Object.fromEntries(
  providers.map((p) => [p.id, p.channel])
);
