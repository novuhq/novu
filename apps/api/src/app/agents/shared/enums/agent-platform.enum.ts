export enum AgentPlatformEnum {
  SLACK = 'slack',
  WHATSAPP = 'whatsapp',
  TEAMS = 'teams',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  SENDBLUE = 'sendblue',
  AGENT_CHAT = 'agent_chat',
}

export const PLATFORMS_WITH_TYPING_INDICATOR = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.WHATSAPP,
  AgentPlatformEnum.TEAMS,
  AgentPlatformEnum.TELEGRAM,
  AgentPlatformEnum.SENDBLUE,
  AgentPlatformEnum.AGENT_CHAT,
]);

type PlatformEgressCapabilities = {
  markdownLinks: boolean;
  nativeUrlButtons: boolean;
  /**
   * Whether the platform can deliver clickable callback buttons (approve/deny
   * cards etc.). When false, tool approvals degrade to the reply-based flow:
   * the card is flattened to text with "Reply YES / NO" instructions and the
   * user's next matching inbound message is consumed as the verdict.
   */
  interactiveButtons: boolean;
};

const DEFAULT_EGRESS_CAPABILITIES: PlatformEgressCapabilities = {
  markdownLinks: true,
  nativeUrlButtons: true,
  interactiveButtons: true,
};

const PLATFORM_EGRESS_CAPABILITIES: Record<AgentPlatformEnum, PlatformEgressCapabilities> = {
  [AgentPlatformEnum.SLACK]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.TEAMS]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.TELEGRAM]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.EMAIL]: DEFAULT_EGRESS_CAPABILITIES,
  [AgentPlatformEnum.WHATSAPP]: {
    markdownLinks: false,
    nativeUrlButtons: false,
    interactiveButtons: true,
  },
  // iMessage/SMS delivery is plain text — no markdown links or buttons of any kind.
  [AgentPlatformEnum.SENDBLUE]: {
    markdownLinks: false,
    nativeUrlButtons: false,
    interactiveButtons: false,
  },
  [AgentPlatformEnum.AGENT_CHAT]: DEFAULT_EGRESS_CAPABILITIES,
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

/** Platforms without callback buttons approve tools by texting back YES / NO. */
export function usesReplyBasedApprovals(platform: string): boolean {
  return !resolvePlatformEgressCapabilities(platform).interactiveButtons;
}

/** Platforms that surface tool approvals via agent-event protocol instead of portable cards. */
export function usesProtocolEventApprovals(platform: string): boolean {
  return platform === AgentPlatformEnum.AGENT_CHAT;
}
