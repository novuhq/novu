import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { EmailSetupGuide } from './email-setup-guide';
import { SlackSetupGuide } from './slack-setup-guide';
import { TeamsSetupGuide } from './teams-setup-guide';
import { TelegramSetupGuide } from './telegram-setup-guide';
import { WhatsAppSetupGuide } from './whatsapp-setup-guide';

export function resolveProviderSetupGuide(providerId: string) {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return SlackSetupGuide;
    case ChatProviderIdEnum.MsTeams:
      return TeamsSetupGuide;
    case ChatProviderIdEnum.WhatsAppBusiness:
      return WhatsAppSetupGuide;
    case ChatProviderIdEnum.Telegram:
      return TelegramSetupGuide;
    case EmailProviderIdEnum.NovuAgent:
      return EmailSetupGuide;
    default:
      return null;
  }
}

export function shouldShowProviderSetupGuide(providerId: string): boolean {
  return Boolean(resolveProviderSetupGuide(providerId));
}
