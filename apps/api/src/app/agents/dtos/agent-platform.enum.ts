export enum AgentPlatformEnum {
  SLACK = 'slack',
  WHATSAPP = 'whatsapp',
  TEAMS = 'teams',
}

export const PLATFORMS_WITH_TYPING_INDICATOR = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
]);
