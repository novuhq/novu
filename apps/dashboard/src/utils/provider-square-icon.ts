const PROVIDER_SQUARE_ICON_FILE_ALIASES: Record<string, string> = {
  whatsapp: 'whatsapp-business',
  'novu-email-agent': 'novu-email',
  email: 'novu-email',
  teams: 'msteams',
};

export function getProviderSquareIconFileName(platform: string): string {
  return PROVIDER_SQUARE_ICON_FILE_ALIASES[platform] ?? platform;
}
