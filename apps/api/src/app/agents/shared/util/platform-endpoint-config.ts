import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';

interface PlatformEndpointMapping {
  endpointType: ChannelEndpointType;
  identityField: string;
}

export const PLATFORM_ENDPOINT_CONFIG: Partial<Record<AgentPlatformEnum, PlatformEndpointMapping>> = {
  [AgentPlatformEnum.SLACK]: {
    endpointType: ENDPOINT_TYPES.SLACK_USER,
    identityField: 'userId',
  },
  [AgentPlatformEnum.TEAMS]: {
    endpointType: ENDPOINT_TYPES.MS_TEAMS_USER,
    identityField: 'userId',
  },
  // Telegram subscriber resolution is DM-only: for 1:1 chats with the bot,
  // Telegram's chat.id equals the sender's user.id, so the chatId stored on
  // telegram_chat endpoints is also the value of message.author.userId on inbound.
  [AgentPlatformEnum.TELEGRAM]: {
    endpointType: ENDPOINT_TYPES.TELEGRAM_CHAT,
    identityField: 'chatId',
  },
};

/**
 * Platforms whose inbound message path auto-provisions a Subscriber +
 * ChannelEndpoint on first mention. Single source of truth shared by the
 * resolver (`resolveOrProvision`) and the inbound handler (branching between
 * `resolveOrProvision` and `resolveOnly`). Other platforms keep their existing
 * lookup-only semantics: WhatsApp by phone, Email by address, Telegram via
 * `/start` deep-link.
 */
export const AUTO_PROVISION_PLATFORM_ENTRIES = [
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
] as const satisfies readonly AgentPlatformEnum[];

export type AutoProvisionPlatform = (typeof AUTO_PROVISION_PLATFORM_ENTRIES)[number];

export const AUTO_PROVISION_PLATFORMS: ReadonlySet<AgentPlatformEnum> = new Set(AUTO_PROVISION_PLATFORM_ENTRIES);

export function isAutoProvisionPlatform(platform: AgentPlatformEnum): boolean {
  return AUTO_PROVISION_PLATFORMS.has(platform);
}
