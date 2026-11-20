'use client';

import { ConnectionState } from '@/components/assistant-ui/elements/connection-state';
import { WebChatThread } from './assistant-ui/thread';

/**
 * assistant-ui shell. `useWebChat` still owns messages, send, and approvals.
 * Error banners live in the thread's `Banner` slot, above the composer.
 */
export type ChatPanelProps = {
  isRecovering: boolean;
};

export function ChatPanel({ isRecovering }: ChatPanelProps) {
  return (
    <div className="chat-main">
      {isRecovering ? (
        // Float over the thread so a reconnect does not shift the messages.
        <div className="absolute top-3 left-1/2 z-20 w-[calc(100%-48px)] max-w-[680px] -translate-x-1/2">
          <ConnectionState phase="reconnecting" className="w-full max-w-none" />
        </div>
      ) : null}

      <WebChatThread />
    </div>
  );
}
