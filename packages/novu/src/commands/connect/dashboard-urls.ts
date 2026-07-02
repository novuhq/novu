import type { ChannelChoice } from './types';

export const DASHBOARD_ONLY_CHANNELS: ReadonlyArray<ChannelChoice> = ['whatsapp', 'teams'];

export function buildConnectClaimUrl(input: { connectDashboardUrl: string; token: string }): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');

  return `${base}/connect/claim?token=${encodeURIComponent(input.token)}`;
}

export function buildConnectAgentDetailsUrl(input: {
  connectDashboardUrl: string;
  environmentSlug: string | null;
  agentIdentifier: string;
  tab?: 'integrations' | 'overview';
}): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');
  const agentPath = input.environmentSlug
    ? `/env/${input.environmentSlug}/connect/agents/${encodeURIComponent(input.agentIdentifier)}`
    : `/connect/agents/${encodeURIComponent(input.agentIdentifier)}`;

  if (input.tab === 'integrations') {
    return `${base}${agentPath}/integrations`;
  }

  return `${base}${agentPath}`;
}

export function isDashboardOnlyChannel(channel: ChannelChoice): boolean {
  return DASHBOARD_ONLY_CHANNELS.includes(channel);
}

export function channelDisplayName(channel: ChannelChoice): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'teams':
      return 'Microsoft Teams';
    case 'slack':
      return 'Slack';
    case 'telegram':
      return 'Telegram';
    case 'email':
      return 'Email';
    default:
      return channel;
  }
}
