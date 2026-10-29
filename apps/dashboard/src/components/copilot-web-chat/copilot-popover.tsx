import { type KeyboardEvent, useEffect, useRef } from 'react';
import { RiAddLine, RiArrowRightSLine, RiCloseLine, RiCornerDownLeftLine, RiErrorWarningFill } from 'react-icons/ri';
import { CopilotSlackConnectBanner } from '@/components/agents/copilot-slack-connect-banner';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import {
  CopilotAssistantMessage,
  CopilotErrorNotice,
  CopilotThinkingIndicator,
  CopilotUserMessage,
} from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getFailedSend, getUserMessageText, hasPendingReplyGap } from './copilot-web-chat-utils';

const SUGGESTIONS = ['Autocomplete workflow', 'Audit this workflow'];

function HeaderButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-6 items-center justify-center rounded-md text-text-soft hover:bg-bg-soft hover:text-text-strong disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--stroke-soft))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--stroke-soft))_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="relative flex size-11 items-center justify-center rounded-xl border border-stroke-soft bg-bg-white shadow-xs">
          <BroomSparkle className="size-6" />
        </div>
        <div className="relative text-label-sm text-text-strong">Novu Copilot</div>
        <p className="relative text-xs leading-4 text-text-soft">
          Suggests improvements, fills gaps, and applies best practices as you build.
        </p>
      </div>
      <div className="flex flex-col rounded-lg border border-stroke-soft bg-bg-white">
        <div className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase leading-4 tracking-wider text-text-soft">
          Try asking
        </div>
        <div className="flex flex-col divide-y divide-stroke-soft">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              title={suggestion}
              onClick={() => onSuggestion(suggestion)}
              className="flex h-9 items-center gap-2 px-3 text-left text-xs leading-4 text-text-sub outline-none last:rounded-b-lg hover:bg-bg-weak hover:text-text-strong focus-visible:bg-bg-weak focus-visible:text-text-strong"
            >
              <span className="min-w-0 flex-1 truncate">{suggestion}</span>
              <RiArrowRightSLine className="size-4 shrink-0 text-text-soft" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Composer({ hasMessages }: { hasMessages: boolean }) {
  const {
    chat,
    sendMessage,
    retry,
    pageContext,
    draft: value,
    setDraft: setValue,
    isBusy,
    focusRequest,
  } = useCopilotWebChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // The failure stays until retried or a new chat starts: the strip is the only place it can be retried.
  const showFailureStrip = !!getFailedSend(chat?.messages ?? []);
  const canSend = value.trim().length > 0 && !isBusy && !chat?.isLoading;
  const contextLabel = [pageContext?.workflowLabel, pageContext?.stepLabel].filter(Boolean).join(' / ');

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-focus whenever open() is called again
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [focusRequest]);

  const submit = () => {
    if (!canSend) return;

    const text = value;
    setValue('');
    void sendMessage(text).then((accepted) => {
      if (!accepted) setValue(text);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 pt-0">
      {!showFailureStrip && <CopilotSlackConnectBanner />}
      <div className="flex flex-col gap-2 rounded-md bg-bg-white p-2 shadow-[0_1px_3px_rgba(14,18,27,0.12)] ring-1 ring-stroke-soft">
        {showFailureStrip && (
          <div role="alert" className="flex items-center gap-1.5 border-b border-stroke-soft pb-2 text-xs leading-4">
            <RiErrorWarningFill className="size-3.5 shrink-0 text-error-base" />
            <span className="min-w-0 flex-1 text-text-sub">Couldn't send. Your message is saved.</span>
            <button
              type="button"
              onClick={() => void retry()}
              disabled={isBusy}
              className="font-medium text-text-strong hover:underline disabled:opacity-40"
            >
              Retry
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          rows={2}
          aria-label="Message Copilot"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hasMessages ? 'Ask a follow-up…' : 'Ask for changes… eg: Make the workflow high severity'}
          className="min-h-8 w-full resize-none bg-transparent text-xs leading-4 text-text-strong outline-none placeholder:text-text-soft"
        />
        <div className="flex items-center justify-between gap-2">
          {contextLabel ? (
            <span className="max-w-[260px] truncate rounded-md bg-bg-weak px-1.5 py-0.5 font-mono text-[10px] leading-4 text-text-sub">
              {contextLabel}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Send message"
            disabled={!canSend}
            onClick={submit}
            className={cn(
              'flex size-6 items-center justify-center rounded-md',
              canSend ? 'bg-text-strong text-white hover:opacity-90' : 'bg-bg-soft text-text-soft'
            )}
          >
            <RiCornerDownLeftLine className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Thread() {
  const { chat, retry, sentContextLabels, hasRunError, isBusy } = useCopilotWebChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = chat?.messages ?? [];
  const showThinking = (isBusy || !!chat?.typing) && hasPendingReplyGap(messages);
  const lastMessage = messages[messages.length - 1];
  const pagination = chat?.pagination;
  let userIndex = 0;

  // Keyed on the newest message (a new object on every streamed update), so loading older pages doesn't jump to the bottom.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every message update while streaming
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lastMessage, hasRunError, showThinking]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-6">
        {pagination?.hasMore && (
          <button
            type="button"
            disabled={pagination.status === 'loading'}
            onClick={() => void pagination.fetchMore()}
            className="self-center text-xs leading-4 text-text-sub hover:text-text-strong hover:underline disabled:opacity-60"
          >
            {pagination.status === 'loading' ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}
        {messages.map((message) => {
          if (message.role !== 'user') return <CopilotAssistantMessage key={message.id} message={message} />;

          const contextLabel = sentContextLabels[userIndex++];

          return <CopilotUserMessage key={message.id} message={message} contextLabel={contextLabel} />;
        })}
        {showThinking && <CopilotThinkingIndicator label={chat?.typing?.status || undefined} />}
        {/* A failed send is surfaced by the composer strip instead. */}
        {hasRunError && !chat?.isRunning && !getFailedSend(messages) && (
          <CopilotErrorNotice onRetry={() => void retry()} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-bg-white to-transparent" />
    </div>
  );
}

export function CopilotPopover() {
  const { isAvailable, isOpen, close, chat, sendMessage, startNewConversation, isBusy, hasRunError } =
    useCopilotWebChat();
  const track = useTelemetry();

  if (!isOpen || !isAvailable) return null;

  const messages = chat?.messages ?? [];
  const hasMessages = messages.length > 0;
  const firstUser = messages.find((message) => message.role === 'user');
  const title = (firstUser && getUserMessageText(firstUser)) || 'Novu Copilot';

  return (
    <div
      role="dialog"
      aria-label="Novu Copilot"
      className="fixed bottom-[66px] right-4 z-40 flex h-[600px] max-h-[min(600px,calc(100vh-82px))] w-[400px] flex-col overflow-hidden rounded-xl border border-stroke-soft bg-bg-white shadow-[0_2px_4px_rgba(15,18,26,0.04),0_12px_32px_-8px_rgba(15,18,26,0.08)]"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stroke-soft bg-bg-weak pl-3.5 pr-2">
        <BroomSparkle className="size-4 shrink-0" isAnimating={isBusy} />
        <span className="min-w-0 flex-1 truncate text-label-sm text-text-sub">{title}</span>
        <HeaderButton label="New chat" disabled={!!chat?.isRunning} onClick={startNewConversation}>
          <RiAddLine className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Close" onClick={close}>
          <RiCloseLine className="size-3.5" />
        </HeaderButton>
      </div>
      {hasMessages || hasRunError ? (
        <Thread />
      ) : chat?.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <CopilotThinkingIndicator label="Loading…" />
        </div>
      ) : (
        <EmptyState
          onSuggestion={(text) => {
            track(TelemetryEvent.COPILOT_SUGGESTION_CLICKED, { suggestion: text });
            void sendMessage(text);
          }}
        />
      )}
      <Composer hasMessages={hasMessages} />
    </div>
  );
}
