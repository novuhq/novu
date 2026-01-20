export function buildSubscriptionIdentifier({
  topicKey,
  subscriberId,
  contextKey,
}: {
  topicKey: string;
  subscriberId?: string;
  contextKey?: string;
}) {
  const base = `tk_${topicKey}:si_${subscriberId}`;

  // Include context in identifier for uniqueness (only when auto-generated)
  if (contextKey && contextKey.length > 0) {
    return `${base}:ctx_${contextKey}`;
  }

  return base;
}
