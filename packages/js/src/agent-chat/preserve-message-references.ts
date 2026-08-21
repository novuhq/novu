import type { AgentMessage, AgentMessagePart } from './agent-message.types';

function partsEqual(left: AgentMessagePart, right: AgentMessagePart): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function preservePartReferences(previousParts: AgentMessagePart[], nextParts: AgentMessagePart[]): AgentMessagePart[] {
  if (previousParts.length !== nextParts.length) {
    return nextParts;
  }

  let changed = false;
  const preserved = nextParts.map((part, index) => {
    const previousPart = previousParts[index];
    if (previousPart && partsEqual(previousPart, part)) {
      return previousPart;
    }

    changed = true;

    return part;
  });

  return changed ? preserved : previousParts;
}

/**
 * Reuse message and part object references from the previous publication when content is unchanged.
 */
export function preserveMessageReferences(previous: AgentMessage[], next: AgentMessage[]): AgentMessage[] {
  const previousById = new Map(previous.map((message) => [message.id, message]));

  return next.map((message) => {
    const previousMessage = previousById.get(message.id);
    if (!previousMessage) {
      return message;
    }

    if (
      previousMessage.role === message.role &&
      previousMessage.status === message.status &&
      previousMessage.createdAt === message.createdAt &&
      previousMessage.parts === message.parts
    ) {
      return previousMessage;
    }

    const preservedParts = preservePartReferences(previousMessage.parts, message.parts);
    if (
      preservedParts === previousMessage.parts &&
      previousMessage.role === message.role &&
      previousMessage.status === message.status &&
      previousMessage.createdAt === message.createdAt
    ) {
      return previousMessage;
    }

    if (preservedParts === message.parts) {
      return message;
    }

    return { ...message, parts: preservedParts };
  });
}
