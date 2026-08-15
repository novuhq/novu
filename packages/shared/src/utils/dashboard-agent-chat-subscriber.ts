/**
 * Subscriber identity used only by the dashboard Agent Chat tester.
 * Customer-app smoke tests still use the raw dashboard user id (see the Cursor
 * install prompt), so Connected must never key off that id.
 */
export const DASHBOARD_AGENT_CHAT_SUBSCRIBER_PREFIX = 'novu-dashboard-agent-chat';

export function buildDashboardAgentChatSubscriberId(userId: string): string {
  return `${DASHBOARD_AGENT_CHAT_SUBSCRIBER_PREFIX}:${userId}`;
}

export function isDashboardAgentChatSubscriberId(subscriberId: string | null | undefined): boolean {
  if (!subscriberId) {
    return false;
  }

  return subscriberId.startsWith(`${DASHBOARD_AGENT_CHAT_SUBSCRIBER_PREFIX}:`);
}
