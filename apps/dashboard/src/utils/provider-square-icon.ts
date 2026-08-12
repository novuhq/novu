const PROVIDER_SQUARE_ICON_FILE_ALIASES: Record<string, string> = {
  whatsapp: 'whatsapp-business',
  'novu-email-agent': 'email',
  // Agent Chat has no brand mark — same Novu square as In-App / Novu Anthropic.
  'novu-agent-chat': 'novu',
  'novu-anthropic': 'novu',
  email: 'novu-email',
  teams: 'msteams',
  pagerduty: 'pager-duty',
  grafana: 'grafana-on-call',
  // Channel-specific webhook providers share one generic webhook mark.
  'email-webhook': 'webhook',
  'chat-webhook': 'webhook',
  'push-webhook': 'webhook',
  'tool-webhook': 'webhook',
  'generic-sms': 'webhook',
};

export function getProviderSquareIconFileName(platform: string): string {
  return PROVIDER_SQUARE_ICON_FILE_ALIASES[platform] ?? platform;
}
