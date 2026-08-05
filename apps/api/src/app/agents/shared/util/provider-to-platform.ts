import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';

const PROVIDER_TO_PLATFORM: Partial<Record<string, AgentPlatformEnum>> = {
  [ChatProviderIdEnum.Slack]: AgentPlatformEnum.SLACK,
  [ChatProviderIdEnum.MsTeams]: AgentPlatformEnum.TEAMS,
  [ChatProviderIdEnum.WhatsAppBusiness]: AgentPlatformEnum.WHATSAPP,
  [EmailProviderIdEnum.NovuAgent]: AgentPlatformEnum.EMAIL,
  [ChatProviderIdEnum.Telegram]: AgentPlatformEnum.TELEGRAM,
  [ChatProviderIdEnum.Sendblue]: AgentPlatformEnum.SENDBLUE,
  [ChatProviderIdEnum.NovuWebChat]: AgentPlatformEnum.WEB_CHAT,
};

export function resolveAgentPlatform(providerId: string): AgentPlatformEnum | null {
  return PROVIDER_TO_PLATFORM[providerId] ?? null;
}
