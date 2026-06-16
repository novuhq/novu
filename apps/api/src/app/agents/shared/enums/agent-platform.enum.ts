export enum AgentPlatformEnum {
  SLACK = 'slack',
  WHATSAPP = 'whatsapp',
  TEAMS = 'teams',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
}

export const PLATFORMS_WITH_TYPING_INDICATOR = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.WHATSAPP,
  AgentPlatformEnum.TEAMS,
  AgentPlatformEnum.TELEGRAM,
]);

type PlatformEgressCapabilities = {
  markdownLinks: boolean;
  nativeUrlButtons: boolean;
};

const DEFAULT_EGRESS_CAPABILITIES: PlatformEgressCapabilities = {
  markdownLinks: true,
  nativeUrlButtons: true,
};

const PLATFORM_EGRESS_CAPABILITIES: Record<AgentPlatformEnum, PlatformEgressCapabilities> = {
  [AgentPlatformEnum.SLACK]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.TEAMS]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.TELEGRAM]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.EMAIL]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.WHATSAPP]: {
    markdownLinks: false,
    nativeUrlButtons: false,
  },
};

function resolvePlatformEgressCapabilities(platform: string): PlatformEgressCapabilities {
  return PLATFORM_EGRESS_CAPABILITIES[platform as AgentPlatformEnum] ?? DEFAULT_EGRESS_CAPABILITIES;
}

export function supportsMarkdownLinks(platform: string): boolean {
  return resolvePlatformEgressCapabilities(platform).markdownLinks;
}

export function requiresShortConnectUrl(platform: string): boolean {
  return !resolvePlatformEgressCapabilities(platform).nativeUrlButtons;
}
