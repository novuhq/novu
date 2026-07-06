/**
 * Provenance keys stamped on every auto-provisioned `Subscriber.data` blob.
 * Centralised so the resolver, the adoption service, the sparse index in
 * `subscriber.schema.ts`, and tests stay in lockstep. Flat scalar keys because
 * `SubscriberCustomData` is a `Record<string, scalar>`.
 *
 * Kept in a standalone module (rather than on the resolver) so the adoption
 * service can read the provenance marker without creating an import cycle with
 * the resolver that depends on it.
 */
export const AGENT_PROVISION_DATA_KEYS = {
  source: '__novu_source',
  platform: '__novu_platform',
  platformUserId: '__novu_platformUserId',
  agentIdentifier: '__novu_agentIdentifier',
  firstSeenAt: '__novu_firstSeenAt',
} as const;

/**
 * Sentinel value written to `Subscriber.data[AGENT_PROVISION_DATA_KEYS.source]`
 * for every subscriber the resolver auto-creates from an inbound platform
 * message. The sparse index in `subscriber.schema.ts` keys off this marker —
 * never mutate without coordinating the index.
 */
export const AGENT_PLATFORM_PROVISION_SOURCE = 'agent-platform-provision' as const;
