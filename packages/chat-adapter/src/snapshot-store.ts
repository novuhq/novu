import type { AgentConversation, MetadataSignal, Signal, ThreadSnapshot } from './types.js';

/** Apply metadata signals to a conversation metadata object (immutable). */
export function applyMetadataSignals(
  metadata: Record<string, unknown>,
  signals: Signal[]
): { metadata: Record<string, unknown>; changed: boolean } {
  let next = metadata;
  let changed = false;

  for (const signal of signals) {
    if (signal.type !== 'metadata') {
      continue;
    }

    changed = true;
    next = patchMetadata(next, signal);
  }

  return { metadata: next, changed };
}

function patchMetadata(metadata: Record<string, unknown>, signal: MetadataSignal): Record<string, unknown> {
  if (signal.action === 'clear') {
    return {};
  }

  if (signal.action === 'delete') {
    const next = { ...metadata };
    delete next[signal.key];

    return next;
  }

  return { ...metadata, [signal.key]: signal.value };
}

/** Return a snapshot with metadata/status updates applied locally after outbound signals. */
export function patchSnapshotFromSignals(snapshot: ThreadSnapshot, signals: Signal[]): ThreadSnapshot | null {
  const { metadata, changed: metadataChanged } = applyMetadataSignals(snapshot.conversation.metadata, signals);
  if (!metadataChanged) {
    return null;
  }

  return {
    ...snapshot,
    conversation: patchConversationMetadata(snapshot.conversation, metadata),
  };
}

/** Return a snapshot marked resolved after a successful resolve POST. */
export function patchSnapshotResolved(snapshot: ThreadSnapshot): ThreadSnapshot {
  return {
    ...snapshot,
    conversation: {
      ...snapshot.conversation,
      status: 'resolved',
    },
  };
}

function patchConversationMetadata(
  conversation: AgentConversation,
  metadata: Record<string, unknown>
): AgentConversation {
  return {
    ...conversation,
    metadata,
  };
}
