import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine, RiCornerDownLeftLine, RiErrorWarningFill, RiStopFill } from 'react-icons/ri';
import { CopilotSlackConnectBanner } from '@/components/agents/copilot-slack-connect-banner';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { CopilotEmptyHero } from './copilot-empty-hero';
import { CopilotHistoryPanel } from './copilot-history-panel';
import { type CopilotPanelCopy, getCopilotPanelCopy } from './copilot-pages';
import {
  CopilotAssistantMessage,
  CopilotErrorNotice,
  CopilotThinkingIndicator,
  CopilotUserMessage,
} from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';
import {
  COPILOT_RAISED_SURFACE_SHADOW,
  getCopilotTypingLabel,
  getFailedSend,
  hasPendingReplyGap,
  orderStoppedTurns,
} from './copilot-web-chat-utils';

function EmptyState({
  copy,
  suggestions,
  onSuggestion,
}: {
  copy: CopilotPanelCopy['emptyState'];
  suggestions: CopilotPanelCopy['suggestions'];
  onSuggestion: (text: string) => void;
}) {
  return (
    // `my-auto` rather than `justify-center`, which would push the top out of reach once a short panel scrolls.
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-3 pt-4">
      <div className="my-auto flex flex-col gap-4">
        <CopilotEmptyHero title={copy.title} body={copy.body} />
        {suggestions.length > 0 && (
          <div className="relative flex flex-col rounded-[10px] border border-stroke-white bg-bg-weak p-1">
            <div className="px-2 py-1.5 font-code text-code-xs uppercase text-text-sub">Try asking</div>
            <div className={cn('flex flex-col overflow-hidden rounded-md bg-bg-white', COPILOT_RAISED_SURFACE_SHADOW)}>
              {suggestions.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onClick={() => onSuggestion(label)}
                  className="flex items-center gap-2.5 border-t border-stroke-weak py-2 pl-3 pr-2.5 text-left outline-none first:border-t-0 hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-stroke-strong"
                >
                  {Icon && <Icon className="size-5 shrink-0 text-text-sub" />}
                  <span className="min-w-0 flex-1 truncate text-label-xs text-text-strong">{label}</span>
                  <RiArrowRightSLine className="size-3.5 shrink-0 text-text-sub" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Sits above the input like the Slack connect strip. */
function SendFailureStrip({
  disabled,
  onRetry,
  onDismiss,
}: {
  disabled: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-2 -mb-px flex items-center gap-1 rounded-t-lg border-l border-r border-t border-stroke-soft bg-bg-weak p-2 shadow-xs"
    >
      <RiErrorWarningFill className="size-3.5 shrink-0 text-error-base" aria-hidden />
      <span className="min-w-0 flex-1 text-label-xs font-medium leading-4 text-error-base">
        Couldn’t send. Your message is saved.
      </span>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="cursor-pointer text-label-xs font-medium leading-4 text-text-strong transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        Retry
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex size-4 shrink-0 items-center justify-center text-text-soft transition-colors hover:text-text-sub"
      >
        <RiCloseLine className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function Composer({
  hasMessages,
  placeholder,
  chip,
}: {
  hasMessages: boolean;
  placeholder: string;
  chip: CopilotPanelCopy['chip'];
}) {
  const {
    isAvailable,
    chat,
    sendMessage,
    retry,
    stop,
    draft: value,
    setDraft: setValue,
    isBusy,
    isRevealPending,
    completeReveal,
  } = useCopilotWebChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const failedSend = getFailedSend(chat?.messages ?? []);
  const [dismissedFailureId, setDismissedFailureId] = useState<string>();
  // The failure stays until retried, dismissed or a new chat starts: the strip is the only place it can be retried.
  const showFailureStrip = !!failedSend && failedSend.id !== dismissedFailureId;
  const canSend = isAvailable && value.trim().length > 0 && !isBusy && !chat?.isLoading;
  const ChipIcon = chip?.icon;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!isRevealPending || !textarea) return;

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    completeReveal();
  }, [isRevealPending, completeReveal]);

  const submit = () => {
    if (!canSend) return;

    const text = value;
    setValue('');
    void sendMessage(text).then((accepted) => {
      if (!accepted) setValue(text);
    });
  };

  const onStop = () => {
    // The Stop button locks until the run ends and then gives way to Send, so keep the focus in the composer.
    textareaRef.current?.focus();
    void stop();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    // No gap: the strip above the input sits flush on it, like in the legacy composer.
    <div className="flex flex-col p-3 pt-0">
      {showFailureStrip ? (
        <SendFailureStrip
          disabled={isBusy}
          onRetry={() => void retry()}
          onDismiss={() => setDismissedFailureId(failedSend?.id)}
        />
      ) : (
        <CopilotSlackConnectBanner />
      )}
      <div className="flex flex-col rounded-md bg-bg-white shadow-[0_1px_3px_rgba(14,18,27,0.12)] ring-1 ring-stroke-soft">
        <textarea
          ref={textareaRef}
          value={value}
          rows={2}
          aria-label="Message Copilot"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hasMessages ? 'Ask a follow-up…' : placeholder}
          className="w-full resize-none bg-transparent px-3 pt-3 text-label-xs text-text-strong outline-none placeholder:text-text-soft"
        />
        <div className="flex items-center justify-between gap-2 p-1.5">
          {chip ? (
            <span className="flex min-w-0 max-w-[260px] items-center gap-1 rounded-md bg-bg-weak py-1 pl-1.5 pr-2 text-label-xs text-text-sub">
              {ChipIcon && <ChipIcon className="size-3 shrink-0" aria-hidden />}
              <span className="truncate">{chip.label}</span>
            </span>
          ) : (
            <span />
          )}
          {isBusy ? (
            <button
              type="button"
              aria-label={chat?.isStopping ? 'Stopping' : 'Stop generating'}
              title={chat?.isStopping ? 'Stopping' : 'Stop generating'}
              // Stopping takes until the agent's current step ends, so a second click has nothing to add.
              disabled={chat?.isStopping}
              onClick={onStop}
              className="flex size-6 items-center justify-center rounded-md bg-bg-strong text-text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
            >
              <RiStopFill className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Send message"
              disabled={!canSend}
              onClick={submit}
              className={cn(
                'flex size-6 items-center justify-center rounded-md',
                canSend ? 'bg-bg-strong text-text-white hover:opacity-90' : 'bg-bg-weak text-text-disabled'
              )}
            >
              <RiCornerDownLeftLine className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Thread() {
  const { chat, retry, hasRunError, isBusy } = useCopilotWebChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = chat?.messages ?? [];
  const isStopping = !!chat?.isStopping;
  // A stop only lands once the agent's current step ends (seconds when it is saving changes), so say so meanwhile.
  const showThinking = (isBusy || !!chat?.typing) && (isStopping || hasPendingReplyGap(messages));
  const thinkingLabel = isStopping ? 'Stopping…' : getCopilotTypingLabel(chat?.typing?.status);
  const lastMessage = messages[messages.length - 1];
  // Snapshots are deep-cloned on every update, so scroll on what the newest message shows, not its identity.
  const tailKey = lastMessage
    ? `${lastMessage.id}:${lastMessage.status}:${JSON.stringify(lastMessage.parts).length}`
    : '';
  const pagination = chat?.pagination;

  // Keyed on the newest message's content, so loading older pages keeps the reader's place.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the newest message changes while streaming
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [tailKey, hasRunError, showThinking]);

  // The step editor keeps this tab mounted but hidden (0px tall, scroll reset), so it would reopen at the top.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    let wasHidden = element.clientHeight === 0;
    const observer = new ResizeObserver(() => {
      const isHidden = element.clientHeight === 0;
      if (wasHidden && !isHidden) element.scrollTop = element.scrollHeight;
      wasHidden = isHidden;
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

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
        {orderStoppedTurns(messages).map((message) =>
          message.role === 'user' ? (
            <CopilotUserMessage key={message.id} message={message} />
          ) : (
            <CopilotAssistantMessage key={message.id} message={message} />
          )
        )}
        {showThinking && <CopilotThinkingIndicator label={thinkingLabel} />}
        {/* A failed send is surfaced by the composer strip instead. */}
        {hasRunError && !chat?.isRunning && !getFailedSend(messages) && (
          <CopilotErrorNotice onRetry={() => void retry()} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-bg-white to-transparent" />
    </div>
  );
}

function CenteredStatus({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center">{children}</div>;
}

function ThreadBody({
  hasMessages,
  emptyState,
  suggestions,
}: {
  hasMessages: boolean;
  emptyState: CopilotPanelCopy['emptyState'];
  suggestions: CopilotPanelCopy['suggestions'];
}) {
  const { isAvailable, isConnecting, chat, sendMessage, hasRunError, surface, pageContext } = useCopilotWebChat();
  const track = useTelemetry();

  if (hasMessages || hasRunError) return <Thread />;

  if (isConnecting) {
    return (
      <CenteredStatus>
        <CopilotThinkingIndicator label="Connecting…" />
      </CenteredStatus>
    );
  }

  if (!isAvailable) {
    return (
      <CenteredStatus>
        <span className="text-xs leading-4 text-text-soft">Copilot is off</span>
      </CenteredStatus>
    );
  }

  if (chat?.isLoading) {
    return (
      <CenteredStatus>
        <CopilotThinkingIndicator label="Loading…" />
      </CenteredStatus>
    );
  }

  return (
    <EmptyState
      copy={emptyState}
      suggestions={suggestions}
      onSuggestion={(text) => {
        track(TelemetryEvent.COPILOT_SUGGESTION_CLICKED, { suggestion: text, surface, page: pageContext?.page });
        void sendMessage(text);
      }}
    />
  );
}

/**
 * The conversation, its empty state and the composer, shared by the popover and the sidebar, or the chat history in
 * their place. On a Copilot page the page's copy and suggestions replace the workflow editor's.
 */
export function CopilotThreadPanel() {
  const { chat, pageContext, isHistoryOpen } = useCopilotWebChat();
  const hasMessages = (chat?.messages.length ?? 0) > 0;
  const copy = getCopilotPanelCopy(pageContext);

  if (isHistoryOpen) return <CopilotHistoryPanel />;

  return (
    <>
      <ThreadBody hasMessages={hasMessages} emptyState={copy.emptyState} suggestions={copy.suggestions} />
      <Composer hasMessages={hasMessages} placeholder={copy.placeholder} chip={copy.chip} />
    </>
  );
}
