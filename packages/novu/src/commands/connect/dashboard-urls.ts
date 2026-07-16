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

/**
 * Minimal dashboard page with the "Log in with Facebook" Embedded Signup
 * button. Requires an environment slug — keyless sessions are upgraded to
 * dashboard auth before this URL is ever built.
 */
export function buildWhatsAppSignupUrl(input: {
  connectDashboardUrl: string;
  environmentSlug: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');

  return (
    `${base}/env/${input.environmentSlug}/agents/${encodeURIComponent(input.agentIdentifier)}/whatsapp-signup` +
    `?integration=${encodeURIComponent(input.integrationIdentifier)}`
  );
}

/** `https://wa.me/<digits>` deep link from a display phone number like "+1 555-123-4567". */
export function buildWaMeUrl(displayPhoneNumber: string): string | null {
  const digits = displayPhoneNumber.replace(/\D/g, '');
  if (!digits) return null;

  return `https://wa.me/${digits}`;
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
    case 'sendblue':
      return 'iMessage (Sendblue)';
    default:
      return channel;
  }
}
