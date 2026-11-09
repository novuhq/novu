import { type FC, type KeyboardEvent, type ReactNode, type SVGProps, useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiArrowRightSLine, RiCloseLine, RiCornerDownLeftLine, RiErrorWarningFill, RiStopFill } from 'react-icons/ri';
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
import { getCopilotTypingLabel, getFailedSend, hasPendingReplyGap, orderStoppedTurns } from './copilot-web-chat-utils';

export type CopilotSuggestion = { label: string; icon?: IconType | FC<SVGProps<SVGSVGElement>> };

const DEFAULT_SUGGESTIONS: CopilotSuggestion[] = [{ label: 'Autocomplete workflow' }, { label: 'Audit this workflow' }];

function EmptyState({
  suggestions,
  onSuggestion,
}: {
  suggestions: CopilotSuggestion[];
  onSuggestion: (text: string) => void;
}) {
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
          {suggestions.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              title={label}
              onClick={() => onSuggestion(label)}
              className="flex h-9 items-center gap-2 px-3 text-left text-xs leading-4 text-text-sub outline-none last:rounded-b-lg hover:bg-bg-weak hover:text-text-strong focus-visible:bg-bg-weak focus-visible:text-text-strong"
            >
              {Icon && <Icon className="size-3.5 shrink-0 text-text-soft" />}
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <RiArrowRightSLine className="size-4 shrink-0 text-text-soft" />
            </button>
          ))}
        </div>
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

function Composer({ hasMessages }: { hasMessages: boolean }) {
  const {
    isAvailable,
    chat,
    sendMessage,
    retry,
    stop,
    pageContext,
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
  const contextLabel = [pageContext?.workflowLabel, pageContext?.stepLabel].filter(Boolean).join(' / ');

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
      <div className="flex flex-col gap-2 rounded-md bg-bg-white p-2 shadow-[0_1px_3px_rgba(14,18,27,0.12)] ring-1 ring-stroke-soft">
        <textarea
          ref={textareaRef}
          value={value}
          rows={2}
          aria-label="Message Copilot"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hasMessages ? 'Ask a follow-up…' : 'Ask anything about this page…'}
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
                canSend ? 'bg-bg-strong text-text-white hover:opacity-90' : 'bg-bg-soft text-text-soft'
              )}
            >
              <RiCornerDownLeftLine className="size-3.5" />
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

function ThreadBody({ hasMessages, suggestions }: { hasMessages: boolean; suggestions: CopilotSuggestion[] }) {
  const { isAvailable, isConnecting, chat, sendMessage, hasRunError, surface } = useCopilotWebChat();
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
      suggestions={suggestions}
      onSuggestion={(text) => {
        track(TelemetryEvent.COPILOT_SUGGESTION_CLICKED, { suggestion: text, surface });
        void sendMessage(text);
      }}
    />
  );
}

/** The conversation, its empty state and the composer, shared by the popover and the sidebar. */
export function CopilotThreadPanel({ suggestions = DEFAULT_SUGGESTIONS }: { suggestions?: CopilotSuggestion[] }) {
  const { chat } = useCopilotWebChat();
  const hasMessages = (chat?.messages.length ?? 0) > 0;

  return (
    <>
      <ThreadBody hasMessages={hasMessages} suggestions={suggestions} />
      <Composer hasMessages={hasMessages} />
    </>
  );
}
