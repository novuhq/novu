import { ChatProviderIdEnum, EmailProviderIdEnum } from '../../types';

export type ConversationalProvider = {
  providerId: string;
  displayName: string;
  comingSoon?: boolean;
  requiresBusinessTier?: boolean;
};

export const CONVERSATIONAL_PROVIDERS: ConversationalProvider[] = [
  { providerId: ChatProviderIdEnum.Slack, displayName: 'Slack' },
  { providerId: ChatProviderIdEnum.MsTeams, displayName: 'MS Teams' },
  { providerId: ChatProviderIdEnum.WhatsAppBusiness, displayName: 'WhatsApp Business' },
  { providerId: EmailProviderIdEnum.NovuAgent, displayName: 'Novu Email', requiresBusinessTier: true },
  { providerId: 'telegram', displayName: 'Telegram', comingSoon: true },
  { providerId: 'google-chat', displayName: 'Google Chat', comingSoon: true },
  { providerId: 'linear', displayName: 'Linear', comingSoon: true },
  { providerId: 'zoom', displayName: 'Zoom', comingSoon: true },
  { providerId: 'imessages', displayName: 'iMessages', comingSoon: true },
];

export const CONVERSATIONAL_PROVIDER_IDS = new Set(CONVERSATIONAL_PROVIDERS.map((p) => p.providerId));
