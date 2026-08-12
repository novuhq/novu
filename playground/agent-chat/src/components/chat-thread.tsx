'use client';

import type { AgentMessage } from '@novu/react';
import { useCallback, useEffect, useRef } from 'react';
import type { RespondToAction } from './approval-card';
import { ChatIcon, SparkIcon } from './icons';
import { MessageRow } from './message-bubble';

/** Matches `AgentConversationTyping` from `@novu/react` / the event protocol. */
type TypingState = { status?: string };

type ChatThreadProps = {
  messages: AgentMessage[];
  /** Durable run state: set by live run lifecycle events and by history replay after a reload. */
  isRunning: boolean;
  /** Live `channel.typing` from `useAgentChat`. Absent when the agent is idle. */
  typing?: TypingState;
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => Promise<unknown>;
  onRespond?: RespondToAction;
};

function AgentStatusRow({ status }: { status?: string }) {
  // Server statuses often arrive with their own trailing ellipsis or dots.
  const label = (status?.trim() || 'Thinking').replace(/[.\u2026]+$/, '');

  return (
    <div className="typing-row" role="status" aria-live="polite" aria-label={label}>
      <div className="msg-avatar" aria-hidden>
        <SparkIcon size={14} />
      </div>
      <span className="typing-shimmer">{label}…</span>
    </div>
  );
}

export function ChatThread({
  messages,
  isRunning,
  typing,
  hasMore,
  isFetching,
  onFetchMore,
  onRespond,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  // Keyed on the tail, not the count: an older page prepends and must not scroll.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastMessage?.id, lastMessage?.parts, typing, isRunning]);

  const loadOlder = useCallback(async () => {
    const container = scrollRef.current;
    const heightBefore = container?.scrollHeight ?? 0;

    await onFetchMore();

    // Hold the reading position: the prepended page grows the thread upwards.
    requestAnimationFrame(() => {
      if (!container) return;
      container.scrollTop += container.scrollHeight - heightBefore;
    });
  }, [onFetchMore]);

  return (
    <div className="thread" role="log" aria-live="polite" data-running={isRunning} ref={scrollRef}>
      <div className="thread-inner">
        {hasMore ? (
          <div className="thread-older">
            <button type="button" className="thread-older-btn" onClick={() => void loadOlder()} disabled={isFetching}>
              {isFetching ? <span className="spinner" aria-hidden /> : null}
              {isFetching ? 'Loading older messages' : 'Load older messages'}
            </button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="thread-empty">
            <div className="thread-empty-glyph">
              <ChatIcon />
            </div>
            <p className="thread-empty-title">Start a conversation</p>
            <p className="thread-empty-copy">
              Messages flow through <code>useAgentChat</code>. Agent replies stream in over the socket as the run
              progresses.
            </p>
          </div>
        ) : (
          messages.map((message) => <MessageRow key={message.id} message={message} onRespond={onRespond} />)
        )}
        {typing || isRunning ? <AgentStatusRow status={typing?.status} /> : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
