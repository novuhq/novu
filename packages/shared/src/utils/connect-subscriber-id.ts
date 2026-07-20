/**
 * @deprecated The `connect:` subscriber prefix is no longer used. Dashboard
 * identity uses the raw user id (same as workflow testing). Kept for one
 * release so existing imports keep compiling.
 */
export const CONNECT_SUBSCRIBER_PREFIX = 'connect';

/**
 * @deprecated Use the dashboard `userId` / `currentUser._id` directly as the
 * subscriber id (same as workflow testing). This helper is now an identity
 * function and will be removed.
 */
export function buildConnectSubscriberId(userId: string): string {
  return userId;
}

/**
 * Stable connection identifier for dashboard agent OAuth (Slack/Teams).
 * Scoped per user + agent so concurrent agent setups do not collide.
 */
export function buildAgentConnectionIdentifier(userId: string, agentId: string): string {
  return `${userId}:agent:${agentId}`;
}
