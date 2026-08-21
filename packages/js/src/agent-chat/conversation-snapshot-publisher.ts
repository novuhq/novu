import type { AgentConversationStatus, AgentConversationTyping, AgentMessage } from './agent-message.types';
import { isStreamingChange } from './is-streaming-change';
import type { AgentChatChange } from './types';

export type ConversationSnapshot = {
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  hasMore: boolean;
  error?: { message: string; code?: string };
};

export type ConversationSnapshotPublisher = {
  schedule: (snapshot: ConversationSnapshot, change: AgentChatChange) => void;
  flush: () => void;
  dispose: () => void;
};

/** Cap React snapshot updates during streaming; store microtask batching handles emitter subscribers. */
export function createConversationSnapshotPublisher(args: {
  throttleMs?: number;
  onPublish: (snapshot: ConversationSnapshot) => void;
}): ConversationSnapshotPublisher {
  let pending: ConversationSnapshot | null = null;
  let lastPublishAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (!pending) {
      return;
    }

    const snapshot = pending;
    pending = null;
    lastPublishAt = Date.now();
    args.onPublish(snapshot);
  };

  const schedule = (snapshot: ConversationSnapshot, change: AgentChatChange): void => {
    pending = snapshot;

    if (!args.throttleMs || !isStreamingChange(change, snapshot)) {
      flush();

      return;
    }

    const elapsed = Date.now() - lastPublishAt;
    if (elapsed >= args.throttleMs) {
      flush();

      return;
    }

    if (timer === undefined) {
      timer = setTimeout(flush, args.throttleMs - elapsed);
    }
  };

  const dispose = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    pending = null;
  };

  return { schedule, flush, dispose };
}
