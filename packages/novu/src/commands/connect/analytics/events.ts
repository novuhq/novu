import { AnalyticService } from '../../../services/analytics.service';

export const CONNECT_EVENTS = {
  STARTED: 'Connect Started',
  AUTH_STARTED: 'Connect Auth Started',
  AUTH_COMPLETED: 'Connect Auth Completed',
  AUTH_FAILED: 'Connect Auth Failed',
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
  TELEGRAM_CONNECTED: 'Connect Telegram Connected',
  EMAIL_CONNECTED: 'Connect Email Connected',
  WELCOME_SENT: 'Connect Welcome Sent',
  COMPLETED: 'Connect Completed',
  ERROR: 'Connect Error',
} as const;

export type ConnectEvent = (typeof CONNECT_EVENTS)[keyof typeof CONNECT_EVENTS];

export function trackConnect(
  analytics: AnalyticService,
  anonymousId: string | undefined,
  event: ConnectEvent | string,
  data: Record<string, unknown> = {}
): void {
  if (!anonymousId) return;

  analytics.track({
    identity: { anonymousId },
    event,
    data,
  });
}
