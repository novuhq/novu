import { AgentSubscriberAccessEnum, ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';

interface PlatformEndpointMapping {
  endpointType: ChannelEndpointType;
  identityField: string;
}

export type AutoProvisionEndpointType =
  | typeof ENDPOINT_TYPES.SLACK_USER
  | typeof ENDPOINT_TYPES.MS_TEAMS_USER
  | typeof ENDPOINT_TYPES.TELEGRAM_CHAT;

export type AutoProvisionEndpointMapping = {
  endpointType: AutoProvisionEndpointType;
  identityField: string;
};

/**
 * Platforms that auto-provision a Subscriber + ChannelEndpoint on inbound when
 * managed + `subscriberAccess === 'open'`. Telegram also requires a DM (`isTelegramDm`).
 */
export const AUTO_PROVISION_ENDPOINT_CONFIG = {
  [AgentPlatformEnum.SLACK]: {
    endpointType: ENDPOINT_TYPES.SLACK_USER,
    identityField: 'userId',
  },
  [AgentPlatformEnum.TEAMS]: {
    endpointType: ENDPOINT_TYPES.MS_TEAMS_USER,
    identityField: 'userId',
  },
  // Telegram DM-only: chat.id equals sender user.id, so telegram_chat chatId
  // matches message.author.userId on inbound.
  [AgentPlatformEnum.TELEGRAM]: {
    endpointType: ENDPOINT_TYPES.TELEGRAM_CHAT,
    identityField: 'chatId',
  },
} as const satisfies Record<string, AutoProvisionEndpointMapping>;

export const PLATFORM_ENDPOINT_CONFIG: Partial<Record<AgentPlatformEnum, PlatformEndpointMapping>> = {
  ...AUTO_PROVISION_ENDPOINT_CONFIG,
};

export const AUTO_PROVISION_PLATFORM_ENTRIES = [
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
  AgentPlatformEnum.TELEGRAM,
] as const satisfies readonly (keyof typeof AUTO_PROVISION_ENDPOINT_CONFIG)[];

export type AutoProvisionPlatform = (typeof AUTO_PROVISION_PLATFORM_ENTRIES)[number];

export const AUTO_PROVISION_PLATFORMS: ReadonlySet<AgentPlatformEnum> = new Set(AUTO_PROVISION_PLATFORM_ENTRIES);

export function isAutoProvisionPlatform(platform: AgentPlatformEnum): platform is AutoProvisionPlatform {
  return AUTO_PROVISION_PLATFORMS.has(platform);
}

export function getAutoProvisionEndpointConfig(platform: AutoProvisionPlatform): AutoProvisionEndpointMapping {
  return AUTO_PROVISION_ENDPOINT_CONFIG[platform];
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
 * email excludes keyless demos; Telegram requires `isTelegramDm`.
 * Custom-code never auto-provisions — open misses Pass null to the bridge.
 */
export function shouldAutoProvisionInbound(params: {
  platform: AgentPlatformEnum;
  subscriberAccess: AgentSubscriberAccessEnum;
  isManaged: boolean;
  isKeyless?: boolean;
  /** Caller-computed: Telegram DM when chat.id === author userId. */
  isTelegramDm?: boolean;
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
    return params.isTelegramDm === true;
  }

  return isAutoProvisionPlatform(params.platform) || isOpenAccessIdentityPlatform(params.platform);
}
