import { ChatProviderIdEnum } from '@novu/shared';

export function resolveAgentProviderDisplayName(providerId: string): string {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return 'Slack';
    case ChatProviderIdEnum.MsTeams:
      return 'MS Teams';
    case ChatProviderIdEnum.Telegram:
      return 'Telegram';
    case ChatProviderIdEnum.WhatsAppBusiness:
      return 'WhatsApp Business';
    case ChatProviderIdEnum.Sendblue:
      return 'iMessage';
    case ChatProviderIdEnum.NovuWebChat:
      return 'Web Chat';
    default:
      return 'channel';
  }
}
