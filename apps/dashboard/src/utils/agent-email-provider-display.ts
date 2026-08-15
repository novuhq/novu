import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';

export const AGENT_EMAIL_PROVIDER_LABEL = 'Email';
export const AGENT_CHAT_PROVIDER_LABEL = 'Agent Chat';

function isAgentEmailProvider(providerId: string): boolean {
  return providerId === EmailProviderIdEnum.NovuAgent;
}

export function getAgentChannelDisplayName(providerId: string, displayName: string): string {
  if (isAgentEmailProvider(providerId)) {
    return AGENT_EMAIL_PROVIDER_LABEL;
  }

  if (providerId === ChatProviderIdEnum.NovuAgentChat) {
    return AGENT_CHAT_PROVIDER_LABEL;
  }

  return displayName;
}
