import { buildConnectAgentChatDashboardUrl as buildSharedConnectAgentChatDashboardUrl } from '@novu/shared';
import type { ChannelChoice } from './types';

export const DASHBOARD_ONLY_CHANNELS: ReadonlyArray<ChannelChoice> = ['teams'];

export function buildConnectClaimUrl(input: { connectDashboardUrl: string; token: string }): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');

  return `${base}/connect/claim?token=${encodeURIComponent(input.token)}`;
}

/**
 * Deep link to an agent's details tab. Needs the environment slug: the dashboard
 * only rewrites *single-segment* env-less paths into the current environment, so
 * a slug-less agent path would be bounced to the workflows page. Sessions
 * without a slug (secret-key auth) therefore get the `/agents` list, which the
 * dashboard does resolve to the default environment.
 */
export function buildConnectAgentDetailsUrl(input: {
  connectDashboardUrl: string;
  environmentSlug: string | null;
  agentIdentifier: string;
  tab?: 'integrations' | 'overview';
}): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');

  if (!input.environmentSlug) {
    return `${base}/agents`;
  }

  const tab = input.tab ?? 'overview';

  return `${base}/env/${input.environmentSlug}/agents/${encodeURIComponent(input.agentIdentifier)}/${tab}`;
}

/** Shown for a keyless run with no claim link to hand out (see `unclaimed`). */
export const UNCLAIMED_KEYLESS_HINT =
  'Your agent lives in a temporary keyless workspace. Connect a channel to get a claim link, or re-run `npx novu connect` signed in to keep it.';

export type ConnectSuccessDestination =
  | { kind: 'claim'; url: string }
  | { kind: 'dashboard'; url: string }
  | { kind: 'unclaimed' };

/**
 * Where to send the user once connect finishes. A keyless agent lives in a
 * temporary workspace with no dashboard to sign into, so it is only reachable
 * through the claim link — never through a dashboard URL. `unclaimed` covers a
 * keyless run that produced no claim token (no welcome message was sent).
 */
export function resolveConnectSuccessDestination(input: {
  connectDashboardUrl: string;
  environmentSlug: string | null;
  agentIdentifier: string;
  isKeyless: boolean;
  claimUrl: string | null;
}): ConnectSuccessDestination {
  if (input.isKeyless) {
    return input.claimUrl ? { kind: 'claim', url: input.claimUrl } : { kind: 'unclaimed' };
  }

  return {
    kind: 'dashboard',
    url: buildConnectAgentDetailsUrl({
      connectDashboardUrl: input.connectDashboardUrl,
      environmentSlug: input.environmentSlug,
      agentIdentifier: input.agentIdentifier,
    }),
  };
}

export function buildConnectAgentChatDashboardUrl(input: {
  connectDashboardUrl: string;
  environmentSlug: string | null;
  agentIdentifier: string;
}): string {
  return buildSharedConnectAgentChatDashboardUrl(input);
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
    case 'agent-chat':
      return 'Agent Chat';
    default:
      return channel;
  }
}
