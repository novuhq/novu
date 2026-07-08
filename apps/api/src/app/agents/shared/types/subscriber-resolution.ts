/**
 * Discriminated result of mapping an inbound platform identity to a Novu
 * subscriber. Exists so "no subscriber exists" is never conflated with
 * "resolution broke": the gate that replies to unresolved senders logs the
 * outcome and picks its user-facing copy from it.
 */
export interface SubscriberResolutionResolved {
  outcome: 'resolved';
  subscriberId: string;
}

/** Lookup ran cleanly and no subscriber matched the platform identity. */
export interface SubscriberResolutionNotFound {
  outcome: 'not_found';
}

/** The platform identity is unusable for lookup (empty, or not a valid email address). */
export interface SubscriberResolutionInvalidIdentity {
  outcome: 'invalid_identity';
}

/** Resolution itself failed (DB error, timeout) — subscriber state is unknown, not absent. */
export interface SubscriberResolutionError {
  outcome: 'error';
  err: unknown;
}

export type SubscriberResolution =
  | SubscriberResolutionResolved
  | SubscriberResolutionNotFound
  | SubscriberResolutionInvalidIdentity
  | SubscriberResolutionError;

export type SubscriberResolutionOutcome = SubscriberResolution['outcome'];
