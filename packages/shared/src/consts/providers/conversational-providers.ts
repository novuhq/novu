import { ChatProviderIdEnum } from '../../types';

export type ConversationalProvider = {
  providerId: string;
  displayName: string;
  comingSoon?: boolean;
};

export const CONVERSATIONAL_PROVIDERS: ConversationalProvider[] = [
  { providerId: ChatProviderIdEnum.Slack, displayName: 'Slack' },
  { providerId: ChatProviderIdEnum.MsTeams, displayName: 'MS Teams', comingSoon: true },
  { providerId: ChatProviderIdEnum.WhatsAppBusiness, displayName: 'WhatsApp Business', comingSoon: true },
  { providerId: 'telegram', displayName: 'Telegram', comingSoon: true },
  { providerId: 'google-chat', displayName: 'Google Chat', comingSoon: true },
  { providerId: 'linear', displayName: 'Linear', comingSoon: true },
  { providerId: 'zoom', displayName: 'Zoom', comingSoon: true },
  { providerId: 'imessages', displayName: 'iMessages', comingSoon: true },
];

export const CONVERSATIONAL_PROVIDER_IDS = new Set(CONVERSATIONAL_PROVIDERS.map((p) => p.providerId));
