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
 * Inbound agent inboxes that share the `{slug}-{routingKey}@domain` address.
 * `novu-email-agent` is the dashboard agent inbox. `agent-email-inbox` is Human-only.
 *
 * This list is the `partialFilterExpression` of a unique index
 * (`AGENT_INBOX_ROUTING_KEY_PARTIAL_FILTER`). Adding a member changes that filter
 * and requires the drop-and-recreate migration `agent-email-inbox-routing-key-index`.
 * To hide a provider from an integration picker, use
 * `HIDDEN_INTEGRATION_PROVIDER_IDS` instead — it carries no index.
 */
export const AGENT_INBOX_PROVIDER_IDS = [EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.AgentEmailInbox] as const;

export type AgentInboxProviderId = (typeof AGENT_INBOX_PROVIDER_IDS)[number];

export function isAgentInboxProvider(providerId: string): boolean {
  return (AGENT_INBOX_PROVIDER_IDS as readonly string[]).includes(providerId);
}

/**
 * Novu-managed providers kept out of the integration pickers, because nothing
 * about them is user-configurable: the agent inboxes are provisioned with a
 * shared address, and `agent-voice-call` is the Human voice channel, which holds
 * no address and is linked from the Agent Inbox surfaces instead.
 */
export const HIDDEN_INTEGRATION_PROVIDER_IDS = [
  ...AGENT_INBOX_PROVIDER_IDS,
  ChatProviderIdEnum.AgentVoiceCall,
] as const;

export function isHiddenIntegrationProvider(providerId: string): boolean {
  return (HIDDEN_INTEGRATION_PROVIDER_IDS as readonly string[]).includes(providerId);
}

export const PROVIDER_ID_TO_CHANNEL_MAP: Record<string, ChannelTypeEnum> = Object.fromEntries(
  providers.map((p) => [p.id, p.channel])
);
