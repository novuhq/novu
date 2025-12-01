export function buildDefaultSubscriptionIdentifier(topicKey: string, subscriberId: string): string {
  return `tk_${topicKey}:si_${subscriberId}`;
}
