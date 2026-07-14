import { AgentSubscriberAccessEnum, ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';
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
 * Platforms that auto-provision a Subscriber + ChannelEndpoint on inbound when
 * `subscriberAccess === 'open'`. Email/WhatsApp/Sendblue use identity-only provision via
 * `shouldAutoProvisionInbound` / `isOpenAccessIdentityPlatform` instead.
 * Telegram also requires a DM match (`telegramChatId === platformUserId`).
 */
export const AUTO_PROVISION_PLATFORM_ENTRIES = [
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
  AgentPlatformEnum.TELEGRAM,
] as const satisfies readonly AgentPlatformEnum[];

export type AutoProvisionPlatform = (typeof AUTO_PROVISION_PLATFORM_ENTRIES)[number];

export const AUTO_PROVISION_PLATFORMS: ReadonlySet<AgentPlatformEnum> = new Set(AUTO_PROVISION_PLATFORM_ENTRIES);

export function isAutoProvisionPlatform(platform: AgentPlatformEnum): boolean {
  return AUTO_PROVISION_PLATFORMS.has(platform);
}

/** Email/WhatsApp/Sendblue open-access provision by identity field (no ChannelEndpoint). */
export function isOpenAccessIdentityPlatform(
  platform: AgentPlatformEnum
): platform is AgentPlatformEnum.EMAIL | AgentPlatformEnum.WHATSAPP | AgentPlatformEnum.SENDBLUE {
  return (
    platform === AgentPlatformEnum.EMAIL ||
    platform === AgentPlatformEnum.WHATSAPP ||
    platform === AgentPlatformEnum.SENDBLUE
  );
}

/**
 * Whether inbound text should call `resolveOrProvision` vs lookup-only
 * `resolveSubscriber`. Requires managed runtime + `subscriberAccess === 'open'`;
 * email excludes keyless demos; Telegram requires `telegramChatId === platformUserId` (DM).
 * Custom-code never auto-provisions — open misses Pass null to the bridge.
 */
export function shouldAutoProvisionInbound(params: {
  platform: AgentPlatformEnum;
  subscriberAccess: AgentSubscriberAccessEnum;
  isManaged: boolean;
  isKeyless?: boolean;
  telegramChatId?: string | null;
  platformUserId?: string;
}): boolean {
  if (!params.isManaged) {
    return false;
  }

  if (params.subscriberAccess !== AgentSubscriberAccessEnum.OPEN) {
    return false;
  }

  if (params.platform === AgentPlatformEnum.EMAIL) {
    return !params.isKeyless;
  }

  if (params.platform === AgentPlatformEnum.TELEGRAM) {
    return params.telegramChatId != null && params.telegramChatId === params.platformUserId;
  }

  return isAutoProvisionPlatform(params.platform) || isOpenAccessIdentityPlatform(params.platform);
}
