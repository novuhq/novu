import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiCloseLine, RiCornerDownLeftLine } from 'react-icons/ri';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { CopilotAssistantMessage, CopilotErrorNotice, CopilotUserMessage } from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getUserMessageText } from './copilot-web-chat-utils';

const SUGGESTIONS = ['Autocomplete workflow', 'Audit this workflow', 'Explain this workflow'];

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-text-soft hover:bg-bg-soft hover:text-text-strong"
    >
      {children}
    </button>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <BroomSparkle className="size-6" />
        <div className="text-label-sm text-text-strong">Novu Copilot</div>
        <p className="text-xs leading-4 text-text-soft">
          Suggests improvements, fills gaps, and applies best practices as you build.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="rounded-full border border-stroke-soft bg-bg-white px-3 py-1 text-xs leading-4 text-text-sub hover:bg-bg-weak hover:text-text-strong"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer({ hasMessages }: { hasMessages: boolean }) {
  const { chat, sendMessage, pageContext } = useCopilotWebChat();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning = !!chat?.isRunning;
  const canSend = value.trim().length > 0 && !isRunning;
  const contextLabel = [pageContext?.workflowLabel, pageContext?.stepLabel].filter(Boolean).join(' / ');

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submit = () => {
    if (!canSend) return;

    const text = value;
    setValue('');
    void sendMessage(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="p-3 pt-0">
      <div className="flex flex-col gap-2 rounded-md bg-bg-white p-2 shadow-[0_1px_3px_rgba(14,18,27,0.12)] ring-1 ring-stroke-soft">
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
  const { chat, sendMessage, pageContext, hasRunError } = useCopilotWebChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = chat?.messages ?? [];

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every message update while streaming
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, hasRunError]);

  const failedMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user' && message.status === 'failed');
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  const contextLabel = pageContext?.workflowLabel;
  const retry = () => {
    if (failedMessage) void chat?.retryMessage(failedMessage.id);
    else if (lastUser) void sendMessage(getUserMessageText(lastUser));
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-6">
        {messages.map((message) =>
          message.role === 'user' ? (
            <CopilotUserMessage key={message.id} message={message} contextLabel={contextLabel} />
          ) : (
            <CopilotAssistantMessage key={message.id} message={message} />
          )
        )}
        {hasRunError && !chat?.isRunning && <CopilotErrorNotice onRetry={retry} />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-bg-white to-transparent" />
    </div>
  );
}

export function CopilotPopover() {
  const { isAvailable, isOpen, close, chat, sendMessage } = useCopilotWebChat();
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
      className="fixed bottom-[66px] right-4 z-40 flex h-[640px] max-h-[min(640px,calc(100vh-82px))] w-[400px] flex-col overflow-hidden rounded-xl border border-stroke-soft bg-bg-white shadow-[0_2px_4px_rgba(15,18,26,0.04),0_12px_32px_-8px_rgba(15,18,26,0.08)]"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stroke-soft bg-bg-weak pl-3.5 pr-2">
        <BroomSparkle className="size-4 shrink-0" isAnimating={!!chat?.isRunning} />
        <span className="min-w-0 flex-1 truncate text-label-sm text-text-sub">{title}</span>
        <HeaderButton label="New chat" onClick={() => chat?.startNewConversation()}>
          <RiAddLine className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Minimize" onClick={close}>
          <RiArrowDownSLine className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Close" onClick={close}>
          <RiCloseLine className="size-3.5" />
        </HeaderButton>
      </div>
      {hasMessages ? (
        <Thread />
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
