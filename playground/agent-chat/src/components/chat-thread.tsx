'use client';

import type { AgentMessage } from '@novu/react';
import { useCallback, useEffect, useRef } from 'react';
import type { RespondToApproval } from './approval-card';
import { ChatIcon, SparkIcon } from './icons';
import { MessageRow } from './message-bubble';

type ChatThreadProps = {
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: { status?: string };
  hasMore: boolean;
  isFetching: boolean;
  onFetchMore: () => Promise<unknown>;
  onRespond?: RespondToApproval;
};

function TypingIndicator({ label }: { label: string }) {
  return (
    <article className="msg msg-assistant msg-typing" aria-live="polite" aria-label={label}>
      <div className="msg-avatar" aria-hidden>
        <SparkIcon size={15} />
      </div>
      <div className="msg-content">
        <div className="msg-meta">
          <span className="msg-author">Agent</span>
        </div>
        <div className="msg-bubble typing-bubble">
          <span className="typing-label">{label}</span>
          <span className="typing-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </article>
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
  const typingLabel = typing?.status?.trim() || 'Thinking…';

  // Keyed on the tail, not the count: an older page prepends and must not scroll.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastMessage?.id, lastMessage?.parts, typing]);

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
        {typing ? <TypingIndicator label={typingLabel} /> : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
