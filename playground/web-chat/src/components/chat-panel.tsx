'use client';

import type { UseWebChatResult } from '@novu/react';
import { ConnectionState } from '@/components/assistant-ui/elements/connection-state';
import { ErrorState } from '@/components/assistant-ui/elements/error-state';
import { WebChatThread } from './assistant-ui/thread';

/**
 * assistant-ui shell. `useWebChat` still owns messages, send, and approvals.
 */
export type ChatPanelProps = {
  error?: { message: string };
  isRecovering: boolean;
  catchUpError?: UseWebChatResult['catchUpError'];
  refetch: UseWebChatResult['refetch'];
};

export function ChatPanel({ error, isRecovering, catchUpError, refetch }: ChatPanelProps) {
  return (
    <div className="chat-main">
      {error ? (
        <ErrorState
          title="Something went wrong"
          detail={error.message}
          retrying={false}
          onRetry={() => void refetch()}
        />
      ) : null}

      <ConnectionState phase={isRecovering ? 'reconnecting' : 'online'} />

      {catchUpError ? (
        <ErrorState
          title="Couldn't sync missed messages"
          detail={catchUpError.message}
          retrying={false}
          onRetry={() => void refetch()}
        />
      ) : null}

      <WebChatThread />
    </div>
  );
}
