'use client';

import type { UseWebChatResult } from '@novu/react';
import { Button } from '@/components/ui/button';
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
        <div className="banner-error" role="alert">
          {error.message}
        </div>
      ) : null}

      {isRecovering ? (
        <div className="banner-recovery" role="status" aria-live="polite">
          Syncing missed messages…
        </div>
      ) : null}

      {catchUpError ? (
        <div className="banner-catch-up" role="alert">
          <span>{catchUpError.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Reload conversation
          </Button>
        </div>
      ) : null}

      <WebChatThread />
    </div>
  );
}
