import { ChatProviderIdEnum } from '@novu/shared';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';

const PROVIDER_TO_PLATFORM: Partial<Record<string, AgentPlatformEnum>> = {
  [ChatProviderIdEnum.Slack]: AgentPlatformEnum.SLACK,
  [ChatProviderIdEnum.MsTeams]: AgentPlatformEnum.TEAMS,
  [ChatProviderIdEnum.WhatsAppBusiness]: AgentPlatformEnum.WHATSAPP,
};

export function resolveAgentPlatform(providerId: string): AgentPlatformEnum | null {
  return PROVIDER_TO_PLATFORM[providerId] ?? null;
}
