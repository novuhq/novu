export enum AgentPlatformEnum {
  SLACK = 'slack',
  WHATSAPP = 'whatsapp',
  TEAMS = 'teams',
}

export const PLATFORMS_WITHOUT_TYPING_INDICATOR = new Set<AgentPlatformEnum>([
  AgentPlatformEnum.WHATSAPP,
]);
