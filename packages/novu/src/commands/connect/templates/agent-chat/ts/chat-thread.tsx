'use client';

import type { AgentMessage, UseAgentChatResult } from '@novu/react';
import { useCallback, useEffect, useRef } from 'react';
import { ChatIcon } from './icons';
import { MessageRow } from './message-bubble';

/** Matches `AgentConversationTyping` from `@novu/react` / the event protocol. */
type TypingState = { status?: string };

const STARTER_PROMPTS = ['Hello', 'What can you do?', 'List my MCP tools'] as const;

type ChatThreadProps = {
  messages: AgentMessage[];
  /** Durable run state: set by live run lifecycle events and by history replay after a reload. */
  isRunning: boolean;
  isLoading: boolean;
  /** Live `channel.typing` from `useAgentChat`. Absent when the agent is idle. */
  typing?: TypingState;
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => Promise<unknown>;
  onCardAction: UseAgentChatResult['sendAction'];
  cardActionsDisabled: boolean;
  onSend: UseAgentChatResult['sendMessage'];
};

function AgentStatusRow({ status }: { status?: string }) {
  // Server statuses often arrive with their own trailing ellipsis or dots.
  const label = status?.trim().replace(/[.\u2026]+$/, '');

  return (
    <output className="typing-row" aria-label={label || 'Agent is typing'}>
      <span className="agent-avatar" aria-hidden>
        <ChatIcon size={14} />
      </span>
      <span className="typing-bubble">
        {label ? (
          <span className="typing-label">{label}…</span>
        ) : (
          <span className="typing-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        )}
      </span>
    </output>
  );
}

export function ChatThread({
  messages,
  isRunning,
  isLoading,
  typing,
  hasMore,
  isFetching,
  onFetchMore,
  onCardAction,
  cardActionsDisabled,
  onSend,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

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
            <div className="thread-empty-glyph">
              <ChatIcon />
            </div>
            <h1>Your agent is ready</h1>
            <p>Send a message to see how it replies.</p>
            <div className="starter-prompts">
              {STARTER_PROMPTS.map((prompt) => (
                <button type="button" key={prompt} onClick={() => void onSend(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageRow
              key={message.id}
              message={message}
              showAvatar={message.role !== 'user' && messages[index - 1]?.role !== message.role}
              onCardAction={onCardAction}
              cardActionsDisabled={cardActionsDisabled}
            />
          ))
        )}
        {typing || isRunning || isLoading ? (
          <AgentStatusRow status={typing?.status || (isLoading ? 'Loading conversation' : undefined)} />
        ) : null}
      </div>
    </div>
  );
}
