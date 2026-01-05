export function buildSubscriptionIdentifier({ topicKey, subscriberId }: { topicKey: string; subscriberId?: string }) {
  return `tk_${topicKey}:si_${subscriberId}`;
}
