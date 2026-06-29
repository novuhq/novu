/** Whether a real inbound message has landed (API stamped `connectedAt`). */
export function hasAgentInboundConnection(connectedAt: Date | string | null | undefined): boolean {
  if (connectedAt == null) {
    return false;
  }

  const timestampMs = new Date(connectedAt).getTime();

  return !Number.isNaN(timestampMs) && timestampMs > 0;
}

/** Serialize `connectedAt` for API responses; placeholder epochs are exposed as null. */
export function formatAgentLinkConnectedAt(connectedAt: Date | string | null | undefined): string | null {
  if (!hasAgentInboundConnection(connectedAt)) {
    return null;
  }

  return new Date(connectedAt as string | Date).toISOString();
}

/** Whether the stored timestamp is a known placeholder (Unix epoch) rather than a real connect time. */
export function isPlaceholderAgentLinkConnectedAt(connectedAt: Date | string | null | undefined): boolean {
  return connectedAt != null && !hasAgentInboundConnection(connectedAt);
}

/** Mongo filter: link not yet marked connected by a genuine inbound message. */
export function agentLinkAwaitingInboundConnectionFilter() {
  return {
    $or: [{ connectedAt: null }, { connectedAt: { $exists: false } }, { connectedAt: { $lte: new Date(1) } }],
  };
}
