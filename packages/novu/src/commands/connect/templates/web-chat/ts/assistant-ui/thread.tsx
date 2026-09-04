'use client';

import { NovuApprovalCard } from './elements/novu-approval-card';
import {
  defaultThreadPartGroupBy,
  Thread,
  type ThreadComponents,
} from './elements/thread.aui';
import { ErrorState } from './elements/error-state';
import { ToolFallback } from './elements/tool-fallback.aui';
import { ThinkingIndicator } from './elements/thinking-indicator';
import { Button } from '../ui/button';
import { cn } from '../lib/utils';
import { MessagePrimitive, useAuiState, type ToolCallMessagePartComponent } from '@assistant-ui/react';
import { RotateCcwIcon } from 'lucide-react';
import { useCallback } from 'react';
import { NovuCardUI, NovuFileUI, NovuMcpUI } from './novu-parts';
import { useWebChatUi } from './web-chat-actions';

function approvalStandaloneGroupBy(
  part: Parameters<typeof defaultThreadPartGroupBy>[0],
  context: Parameters<typeof defaultThreadPartGroupBy>[1],
) {
  if (part.type === 'tool-call' && part.approval != null) {
    return [];
  }

  return defaultThreadPartGroupBy(part, context);
}

const NovuToolFallback: ToolCallMessagePartComponent = (props) => {
  const pending =
    props.approval != null &&
    props.approval.approved === undefined &&
    props.approval.resolution === undefined;

  if (pending) {
    return <NovuApprovalCard {...props} />;
  }

  return <ToolFallback {...props} />;
};

const THREAD_COMPONENTS: ThreadComponents = {
  Banner: WebChatBanner,
  Indicator: WebChatTypingIndicator,
  UserMessage: WebChatUserMessage,
  ToolFallback: NovuToolFallback,
  groupBy: approvalStandaloneGroupBy,
};

function WebChatBanner() {
  const { banner } = useWebChatUi();
  if (!banner) return null;

  return (
    <ErrorState
      title={banner.title}
      detail={banner.detail}
      retrying={false}
      className="w-full max-w-none"
      {...(banner.onRetry ? { onRetry: banner.onRetry } : null)}
    />
  );
}

function WebChatTypingIndicator() {
  const { typingLabel, pendingActionCount } = useWebChatUi();
  if (pendingActionCount > 0) return null;

  const label = (typingLabel?.trim() || 'Thinking').replace(/[.\u2026]+$/, '');

  return (
    <ThinkingIndicator
      data-slot="aui_assistant-message-indicator"
      role="status"
      aria-live="polite"
      aria-label={label}
      label={label}
      className="mb-1"
    />
  );
}

function WebChatUserMessage() {
  const { retryMessage, composerBusy } = useWebChatUi();
  const metadata = useAuiState((state) => state.message.metadata);
  const custom = metadata?.custom as { novuStatus?: string; novuMessageId?: string } | undefined;
  const status = custom?.novuStatus;
  const novuMessageId = custom?.novuMessageId;
  const failed = status === 'failed';

  return (
    <MessagePrimitive.Root
      data-role="user"
      data-status={status}
      className="fade-in slide-in-from-bottom-1 animate-in data-[aui-top-anchor-user]:pt-4 grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150"
    >
      <div className="col-start-2 min-w-0">
        <div
          className={cn(
            'text-foreground rounded-xl px-4 py-2 wrap-break-word',
            failed
              ? 'border-destructive/40 bg-destructive/5 border'
              : 'bg-muted',
          )}
        >
          <MessagePrimitive.Parts />
        </div>
        {failed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive mt-1 ml-auto flex h-7 rounded-full px-2.5 text-xs"
            disabled={composerBusy}
            onClick={() => {
              if (novuMessageId) void retryMessage(novuMessageId);
            }}
          >
            <RotateCcwIcon className="size-3.5" />
            Retry
          </Button>
        ) : null}
      </div>
    </MessagePrimitive.Root>
  );
}

function LoadOlder() {
  const { pagination } = useWebChatUi();

  const loadOlder = useCallback(async () => {
    // assistant-ui viewport has no scroll-preservation API; preserve position via DOM delta.
    const container = document.querySelector('[data-slot="aui_thread-viewport"]') as HTMLElement | null;
    const heightBefore = container?.scrollHeight ?? 0;

    await pagination.fetchMore();

    requestAnimationFrame(() => {
      if (!container) return;
      container.scrollTop += container.scrollHeight - heightBefore;
    });
  }, [pagination]);

  if (!pagination.hasMore) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="pointer-events-auto rounded-full bg-background/90 shadow-sm backdrop-blur"
        onClick={() => void loadOlder()}
        disabled={pagination.status === 'loading'}
        data-status={pagination.status}
      >
        {pagination.status === 'loading'
          ? 'Loading older messages…'
          : pagination.status === 'error'
            ? 'Retry loading older messages'
            : 'Load older messages'}
      </Button>
    </div>
  );
}

export function WebChatThread() {
  return (
    <div className="relative min-h-0 flex-1">
      <NovuCardUI />
      <NovuMcpUI />
      <NovuFileUI />
      <LoadOlder />
      <Thread components={THREAD_COMPONENTS} />
    </div>
  );
}
