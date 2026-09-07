/**
 * Subscriber identity used only by the dashboard Web Chat tester.
 * Customer-app smoke tests still use the raw dashboard user id (see the Cursor
 * install prompt), so Connected must never key off that id.
 */
export const DASHBOARD_WEB_CHAT_SUBSCRIBER_PREFIX = 'novu-dashboard-web-chat';

export function buildDashboardWebChatSubscriberId(userId: string): string {
  return `${DASHBOARD_WEB_CHAT_SUBSCRIBER_PREFIX}:${userId}`;
}

export function isDashboardWebChatSubscriberId(subscriberId: string | null | undefined): boolean {
  if (!subscriberId) {
    return false;
  }

  return subscriberId.startsWith(`${DASHBOARD_WEB_CHAT_SUBSCRIBER_PREFIX}:`);
}
