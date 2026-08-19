const PROVIDER_SQUARE_ICON_FILE_ALIASES: Record<string, string> = {
  whatsapp: 'whatsapp-business',
  'novu-email-agent': 'email',
  // Conversation activity stores the platform id (`agent_chat`), not the provider id.
  agent_chat: 'novu-agent-chat',
  // Pre-rename provider id still present on local/dev integrations.
  'novu-web-chat': 'novu-agent-chat',
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
  'photon-imessage': 'photon',
};

export function getProviderSquareIconFileName(platform: string): string {
  return PROVIDER_SQUARE_ICON_FILE_ALIASES[platform] ?? platform;
}
