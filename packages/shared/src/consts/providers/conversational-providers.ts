import { ChatProviderIdEnum, EmailProviderIdEnum } from '../../types';

export type ConversationalProvider = {
  providerId: string;
  displayName: string;
  comingSoon?: boolean;
  requiresBusinessTier?: boolean;
};

export const CONVERSATIONAL_PROVIDERS: ConversationalProvider[] = [
  { providerId: EmailProviderIdEnum.NovuAgent, displayName: 'Novu Email', requiresBusinessTier: true },
  { providerId: ChatProviderIdEnum.Slack, displayName: 'Slack' },
  { providerId: ChatProviderIdEnum.Telegram, displayName: 'Telegram' },
  { providerId: ChatProviderIdEnum.Sendblue, displayName: 'Sendblue' },
  { providerId: ChatProviderIdEnum.Discord, displayName: 'Discord', comingSoon: true },
  { providerId: 'google-chat', displayName: 'Google Chat', comingSoon: true },
  { providerId: 'linear', displayName: 'Linear', comingSoon: true },
  { providerId: 'zoom', displayName: 'Zoom', comingSoon: true },
  { providerId: ChatProviderIdEnum.MsTeams, displayName: 'MS Teams' },
  { providerId: ChatProviderIdEnum.WhatsAppBusiness, displayName: 'WhatsApp Business' },
];

export const CONVERSATIONAL_PROVIDER_IDS = new Set(CONVERSATIONAL_PROVIDERS.map((p) => p.providerId));
