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

/** Platforms where `[label](url)` markdown links do not render (e.g. WhatsApp). */
export const PLATFORMS_WITHOUT_MARKDOWN_LINKS = new Set<AgentPlatformEnum>([AgentPlatformEnum.WHATSAPP]);

/** Platforms where card link-buttons fall back to visible URL text (e.g. WhatsApp). */
export const PLATFORMS_WITHOUT_NATIVE_URL_BUTTONS = new Set<AgentPlatformEnum>([AgentPlatformEnum.WHATSAPP]);

export function supportsMarkdownLinks(platform: string): boolean {
  return !PLATFORMS_WITHOUT_MARKDOWN_LINKS.has(platform as AgentPlatformEnum);
}

export function requiresShortConnectUrl(platform: string): boolean {
  return PLATFORMS_WITHOUT_NATIVE_URL_BUTTONS.has(platform as AgentPlatformEnum);
}
