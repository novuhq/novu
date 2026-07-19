/**
 * @deprecated The `connect:` subscriber prefix is no longer used. Dashboard
 * identity uses the raw user id (same as workflow testing). Kept for one
 * release so existing imports keep compiling.
 */
export const CONNECT_SUBSCRIBER_PREFIX = 'connect';

/**
 * Dashboard identity used as the Novu subscriberId (same as workflow test flows).
 * Historically prefixed with `connect:`; that prefix is no longer used.
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
