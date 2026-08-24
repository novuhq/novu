import { AnalyticService } from '../../../services/analytics.service';

/**
 * Recommended Mixpanel funnel (user identity + `_organization` for org filters):
 *
 * 1. [Authentication] - Create Organization
 * 2. Agents Usecase Selected - [Agents]  (CLI fires this on Agent Created with source=cli)
 * 3. Agent Created - [Agents]            (server; source via novu-analytics-source header)
 *
 * Keep Connect* client events below for path diagnostics — not funnel steps.
 * Avoid using Connect Started as step 1: it fires on every CLI invocation, including
 * interactive runs abandoned at the welcome screen and agent sessions killed before auth.
 * Segment engaged runs with `ci: true` and/or `hasPrompt: true` when comparing to Started.
 */
export const CONNECT_EVENTS = {
  STARTED: 'Connect Started',
  PIPELINE_STARTED: 'Connect Pipeline Started',
  AUTH_STARTED: 'Connect Auth Started',
  AUTH_COMPLETED: 'Connect Auth Completed',
  AUTH_FAILED: 'Connect Auth Failed',
  KEYLESS_LIMIT_AUTH_UPGRADE_STARTED: 'Connect Keyless Limit Auth Upgrade Started',
  AGENT_LISTED: 'Connect Agents Listed',
  AGENT_CREATED: 'Connect Agent Created',
  AGENT_REUSED: 'Connect Agent Reused',
  RUNTIME_SELECTED: 'Connect Runtime Selected',
  AGENT_PROMPT_GENERATED: 'Connect Agent Prompt Generated',
  CHANNEL_SELECTED: 'Connect Channel Selected',
  CHANNEL_SKIPPED: 'Connect Channel Skipped',
  DASHBOARD_REDIRECT_OPENED: 'Connect Dashboard Redirect Opened',
  SLACK_OAUTH_OPENED: 'Connect Slack Oauth Opened',
  SLACK_CONNECTED: 'Connect Slack Connected',
  WHATSAPP_SIGNUP_OPENED: 'Connect Whatsapp Signup Opened',
  WHATSAPP_SIGNUP_COMPLETED: 'Connect Whatsapp Signup Completed',
  WHATSAPP_SIGNUP_TIMED_OUT: 'Connect Whatsapp Signup Timed Out',
  WHATSAPP_SIGNUP_LINK_EXPIRED: 'Connect Whatsapp Signup Link Expired',
  WHATSAPP_CONNECTED: 'Connect Whatsapp Connected',
  TELEGRAM_CONNECTED: 'Connect Telegram Connected',
  EMAIL_CONNECTED: 'Connect Email Connected',
  SENDBLUE_CONNECTED: 'Connect Sendblue Connected',
  AGENT_CHAT_LINKED: 'Connect Agent Chat Linked',
  WELCOME_SENT: 'Connect Welcome Sent',
  COMPLETED: 'Connect Completed',
  ERROR: 'Connect Error',
} as const;

export type ConnectEvent = (typeof CONNECT_EVENTS)[keyof typeof CONNECT_EVENTS];

type ConnectAuthUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function aliasConnectSession(analytics: AnalyticService, anonymousId: string, user: ConnectAuthUser): void {
  analytics.alias({ previousId: anonymousId, userId: user.id });
}

export function trackConnect(
  analytics: AnalyticService,
  anonymousId: string | undefined,
  event: ConnectEvent | string,
  data: Record<string, unknown> = {},
  userId?: string
): void {
  if (!anonymousId) return;

  analytics.track({
    identity: userId ? { userId, anonymousId } : { anonymousId },
    event,
    data,
  });
}
