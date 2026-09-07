/**
 * `connectedAt` values at or before the Unix epoch are placeholders, never a genuine inbound
 * connection. Serialization and the Mongo self-heal filter share this boundary so a link is
 * exposed as connected exactly when it is ineligible for first-message stamping.
 */
const PLACEHOLDER_CONNECTED_AT = new Date(0);

/** Whether a real inbound message has landed (API stamped `connectedAt`). */
export function hasAgentInboundConnection(connectedAt: Date | string | null | undefined): boolean {
  if (connectedAt == null) {
    return false;
  }

  const timestampMs = new Date(connectedAt).getTime();

  return !Number.isNaN(timestampMs) && timestampMs > PLACEHOLDER_CONNECTED_AT.getTime();
}

/** Serialize `connectedAt` for API responses; placeholder epochs are exposed as null. */
export function formatAgentLinkConnectedAt(connectedAt: Date | string | null | undefined): string | null {
  if (!hasAgentInboundConnection(connectedAt)) {
    return null;
  }

  return new Date(connectedAt as string | Date).toISOString();
}

/** Mongo filter: link not yet marked connected by a genuine inbound message. */
export function agentLinkAwaitingInboundConnectionFilter() {
  return {
    $or: [
      { connectedAt: null },
      { connectedAt: { $exists: false } },
      { connectedAt: { $lte: PLACEHOLDER_CONNECTED_AT } },
    ],
  };
}
