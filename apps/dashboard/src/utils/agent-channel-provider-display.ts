import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { getProviderSquareIconFileName } from '@/utils/provider-square-icon';

export const AGENT_EMAIL_PROVIDER_LABEL = 'Email';
export const AGENT_IMESSAGE_PROVIDER_LABEL = 'iMessage';

function isAgentEmailProvider(providerId: string): boolean {
  return providerId === EmailProviderIdEnum.NovuAgent;
}

function isAgentImessageProvider(providerId: string): boolean {
  return providerId === ChatProviderIdEnum.Sendblue;
}

export function getAgentChannelDisplayName(providerId: string, displayName: string): string {
  if (isAgentEmailProvider(providerId)) {
    return AGENT_EMAIL_PROVIDER_LABEL;
  }

  if (isAgentImessageProvider(providerId)) {
    return AGENT_IMESSAGE_PROVIDER_LABEL;
  }

  return displayName;
}

/**
 * Agent-scoped icon override: the Sendblue channel is surfaced as "iMessage" in agent
 * contexts, so it renders the iMessage square icon. The global Sendblue icon is untouched.
 */
export function getAgentChannelIconFileName(providerId: string): string {
  if (isAgentImessageProvider(providerId)) {
    return 'imessages';
  }

  return getProviderSquareIconFileName(providerId);
}
