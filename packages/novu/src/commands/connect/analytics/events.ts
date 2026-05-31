import { AnalyticService } from '../../../services/analytics.service';

export const CONNECT_EVENTS = {
  STARTED: 'Connect Started',
  AUTH_COMPLETED: 'Connect Auth Completed',
  AGENT_LISTED: 'Connect Agents Listed',
  AGENT_CREATED: 'Connect Agent Created',
  AGENT_REUSED: 'Connect Agent Reused',
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
