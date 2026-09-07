export function buildDefaultSubscriptionIdentifier(
  topicKey: string,
  subscriberId: string,
  contextKeys?: string[]
): string {
  const base = `tk_${topicKey}:si_${subscriberId}`;

  // Include context in identifier for uniqueness (only when auto-generated)
  if (contextKeys && contextKeys.length > 0) {
    const contextPart = [...contextKeys].sort().join(',');
    return `${base}:ctx_${contextPart}`;
  }

  return base;
}
