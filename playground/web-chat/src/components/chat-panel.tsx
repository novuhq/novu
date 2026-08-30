'use client';

import type { AgentConversationTyping, AgentMessage, AgentPendingAction, UseWebChatResult } from '@novu/react';
import type { RespondToAction } from './approval-card';
import { ApprovalDock } from './approval-dock';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

/**
 * Presentational shell. Swap this (and the components it uses) for your own UI —
 * it only consumes values from `useWebChat`.
 */
export type ChatPanelProps = {
  conversationId?: string;
  error?: { message: string };
  messages: AgentMessage[];
  pendingActions: AgentPendingAction[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  pagination: UseWebChatResult['pagination'];
  onRespond: RespondToAction;
  composerDisabled: boolean;
  onSend: (text: string) => void;
};

export function ChatPanel({
  conversationId,
  error,
  messages,
  pendingActions,
  isRunning,
  typing,
  pagination,
  onRespond,
  composerDisabled,
  onSend,
}: ChatPanelProps) {
  return (
    <div className="chat-main">
      <header className="chat-topbar">
        <h1>{conversationId ? 'Conversation' : 'New conversation'}</h1>
        {conversationId ? <code>{conversationId}</code> : null}
      </header>

      {error ? (
        <div className="banner-error" role="alert">
          {error.message}
        </div>
      ) : null}

      <ChatThread
        messages={messages}
        isRunning={isRunning}
        typing={typing}
        pagination={pagination}
        onRespond={onRespond}
      />

      <div className="chat-foot">
        <ApprovalDock actions={pendingActions} />
        <Composer pending={composerDisabled} isRunning={isRunning} onSend={onSend} />
      </div>
    </div>
  );
}
