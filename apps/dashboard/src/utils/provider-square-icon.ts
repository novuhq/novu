const PROVIDER_SQUARE_ICON_FILE_ALIASES: Record<string, string> = {
  whatsapp: 'whatsapp-business',
  'novu-email-agent': 'email',
  'novu-anthropic': 'novu',
  email: 'novu-email',
  teams: 'msteams',
  pagerduty: 'pager-duty',
};

export function getProviderSquareIconFileName(platform: string): string {
  return PROVIDER_SQUARE_ICON_FILE_ALIASES[platform] ?? platform;
}
