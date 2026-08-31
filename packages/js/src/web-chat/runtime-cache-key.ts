/** Stable registry key for one agent + conversation thread. */
export function runtimeCacheKey(agentId: string, conversationId: string): string {
  return `${agentId}::${conversationId}`;
}
