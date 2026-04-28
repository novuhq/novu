export enum AgentPlatformEnum {
  SLACK = 'slack',
  WHATSAPP = 'whatsapp',
  TEAMS = 'teams',
  EMAIL = 'email',
}

export const PLATFORMS_WITH_TYPING_INDICATOR = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
]);

export const PLATFORMS_WITH_INTERIM_EDITS = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
]);
