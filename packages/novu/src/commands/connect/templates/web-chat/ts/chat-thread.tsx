'use client';

import type { AgentMessage, UseWebChatResult } from '@novu/react';
import { useCallback, useEffect, useRef } from 'react';
import { ChevronIcon } from './icons';
import { MessageRow } from './message-bubble';

/** Matches `AgentConversationTyping` from `@novu/react` / the event protocol. */
type TypingState = { status?: string };

const STARTER_PROMPTS = ['Hello', 'What can you do?', 'What tools do you have available?'] as const;

type ChatThreadProps = {
  messages: AgentMessage[];
  /** Durable run state: set by live run lifecycle events and by history replay after a reload. */
  isRunning: boolean;
  isLoading: boolean;
  /** Live `channel.typing` from `useWebChat`. Absent when the agent is idle. */
  typing?: TypingState;
  hasPendingActions: boolean;
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => Promise<unknown>;
  onCardAction: UseWebChatResult['sendAction'];
  onRespond: UseWebChatResult['respondToAction'];
  cardActionsDisabled: boolean;
  onSend: UseWebChatResult['sendMessage'];
};

function AgentStatusRow({ status }: { status?: string }) {
  const label = status?.trim().replace(/[.\u2026]+$/, '') || 'Thinking';

  return (
    <output className="typing-row" aria-label={label}>
      <ChevronIcon size={14} />
      <span className="typing-label">{label}…</span>
    </output>
  );
}

export function ChatThread({
  messages,
  isRunning,
  isLoading,
  typing,
  hasPendingActions,
  hasMore,
  isFetching,
  onFetchMore,
  onCardAction,
  onRespond,
  cardActionsDisabled,
  onSend,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];
  const showTypingRow = (Boolean(typing) || isRunning || isLoading) && !hasPendingActions;

  // Keyed on the tail, not the count: an older page prepends and must not scroll.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
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

        {messages.length === 0 && !isRunning && !isLoading ? (
          <div className="thread-empty">
            <p>Hello, I&apos;m your agent. How can I help you today?</p>
            <div className="starter-prompts">
              {STARTER_PROMPTS.map((prompt) => (
                <button type="button" key={prompt} onClick={() => void onSend(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              onCardAction={onCardAction}
              onRespond={onRespond}
              cardActionsDisabled={cardActionsDisabled}
            />
          ))
        )}
        {showTypingRow ? (
          <AgentStatusRow status={typing?.status || (isLoading ? 'Loading conversation' : undefined)} />
        ) : null}
      </div>
    </div>
  );
}
