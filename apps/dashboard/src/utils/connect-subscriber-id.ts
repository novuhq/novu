export const CONNECT_SUBSCRIBER_PREFIX = 'connect';

export function buildConnectSubscriberId(userId: string): string {
  return `${CONNECT_SUBSCRIBER_PREFIX}:${userId}`;
}

export function buildAgentConnectionIdentifier(userId: string, agentId: string): string {
  return `${CONNECT_SUBSCRIBER_PREFIX}:${userId}:agent:${agentId}`;
}
