'use client';

import {
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
} from '@/components/assistant-ui/elements/thread-list.aui';
import { ErrorState } from '@/components/assistant-ui/elements/error-state';
import { NEW_CONVERSATION_THREAD_ID } from '@/lib/thread-list-mapper';
import { useAuiState } from '@assistant-ui/react';

type WebChatThreadListProps = {
  error?: string;
  onRetryError: () => void;
};

export function WebChatThreadList({ error, onRetryError }: WebChatThreadListProps) {
  return (
    <ThreadListRoot>
      <WebChatThreadListNew />
      {error ? (
        <ErrorState
          title="Couldn't load conversations"
          detail={error}
          retrying={false}
          onRetry={() => onRetryError?.()}
        />
      ) : null}
      <ThreadListItems />
    </ThreadListRoot>
  );
}

function WebChatThreadListNew() {
  // ExternalStoreThreadListRuntimeCore never sets newThreadId; mark New active when
  // mainThreadId is the lazy-create sentinel.
  const isNewThreadActive = useAuiState(
    (s) =>
      s.threads.newThreadId === s.threads.mainThreadId ||
      (s.threads.newThreadId == null && s.threads.mainThreadId === NEW_CONVERSATION_THREAD_ID),
  );

  return (
    <ThreadListNew
      {...(isNewThreadActive ? { 'data-active': 'true', 'aria-current': 'true' } : null)}
    />
  );
}
