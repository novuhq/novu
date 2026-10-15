import { ChatProviderIdEnum, isAgentInboxProvider } from '@novu/shared';

export const AGENT_EMAIL_PROVIDER_LABEL = 'Email';
export const WEB_CHAT_PROVIDER_LABEL = 'Web Chat';

export function getAgentChannelDisplayName(providerId: string, displayName: string): string {
  if (isAgentInboxProvider(providerId)) {
    return AGENT_EMAIL_PROVIDER_LABEL;
  }

  if (providerId === ChatProviderIdEnum.NovuWebChat) {
    return WEB_CHAT_PROVIDER_LABEL;
  }

  return displayName;
}
