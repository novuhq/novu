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
 * Platforms whose inbound message path auto-provisions a Subscriber +
 * ChannelEndpoint on first mention when `subscriberAccess === 'open'`.
 * Open-access email/WhatsApp use `shouldAutoProvisionInbound` /
 * `isOpenAccessIdentityPlatform` instead — phone/email identity only, no
 * ChannelEndpoint. Telegram additionally requires a DM identity match
 * (`telegramChatId === platformUserId`); groups stay lookup-only.
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

/** Email/WhatsApp open-access provision by identity field (no ChannelEndpoint). */
export function isOpenAccessIdentityPlatform(platform: AgentPlatformEnum): boolean {
  return platform === AgentPlatformEnum.EMAIL || platform === AgentPlatformEnum.WHATSAPP;
}

/**
 * Whether inbound text should call `resolveOrProvision` vs lookup-only
 * `resolveSubscriber`. Gated by `subscriberAccess === 'open'` on every
 * platform; email also excludes the keyless demo path. Telegram open
 * auto-provisions only when `telegramChatId === platformUserId` (DM).
 */
export function shouldAutoProvisionInbound(params: {
  platform: AgentPlatformEnum;
  subscriberAccess: AgentSubscriberAccessEnum;
  isKeyless?: boolean;
  /** Telegram chat.id (string). Required for Telegram open-access decisions. */
  telegramChatId?: string | null;
  /** Inbound author platform user id; compared to telegramChatId for DM detection. */
  platformUserId?: string;
}): boolean {
  if (params.subscriberAccess !== AgentSubscriberAccessEnum.OPEN) {
    return false;
  }

  if (params.platform === AgentPlatformEnum.EMAIL) {
    return !params.isKeyless;
  }

  if (params.platform === AgentPlatformEnum.TELEGRAM) {
    return params.telegramChatId != null && params.telegramChatId === params.platformUserId;
  }

  return isAutoProvisionPlatform(params.platform) || params.platform === AgentPlatformEnum.WHATSAPP;
}
