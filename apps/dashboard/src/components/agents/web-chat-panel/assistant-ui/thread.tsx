import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  type ToolCallMessagePartComponent,
  useAuiState,
} from '@assistant-ui/react';
import { useCallback, useState } from 'react';
import { RiArrowUpLine, RiCloseFill, RiLoader4Line, RiRefreshLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import {
  WebChatBackToChatsButton,
  WebChatConversationList,
} from '@/components/agents/web-chat-panel/web-chat-conversation-list';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { ErrorState } from './elements/error-state';
import { NovuApprovalCard } from './elements/novu-approval-card';
import { ThinkingIndicator } from './elements/thinking-indicator';
import { defaultThreadPartGroupBy, Thread, type ThreadComponents } from './elements/thread.aui';
import { ToolFallback } from './elements/tool-fallback.aui';
import { NovuCardUI, NovuFileUI, NovuMcpUI } from './novu-parts';
import { useWebChatUi } from './web-chat-actions';

const CHANNEL_PROMO_ICONS = [
  { src: '/images/providers/light/square/slack.svg', label: 'Slack' },
  { src: '/images/providers/light/square/msteams.svg', label: 'Microsoft Teams' },
  { src: '/images/providers/light/square/whatsapp-business.svg', label: 'WhatsApp' },
  { src: '/images/providers/light/square/imessages.svg', label: 'Messages' },
] as const;

const PREVIEW_STRIPE_STYLE = {
  backgroundImage: [
    'linear-gradient(to top, rgba(255,255,255,0) 20%, #fff 85%)',
    'repeating-linear-gradient(-38deg, rgba(255,132,71,0.11) 0px, rgba(255,132,71,0.11) 1.5px, rgba(255,132,71,0.07) 1.5px, rgba(255,132,71,0.07) 5px)',
  ].join(', '),
} as const;

function approvalStandaloneGroupBy(
  part: Parameters<typeof defaultThreadPartGroupBy>[0],
  context: Parameters<typeof defaultThreadPartGroupBy>[1]
) {
  if (part.type === 'tool-call' && part.approval != null) {
    return [];
  }

  return defaultThreadPartGroupBy(part, context);
}

const NovuToolFallback: ToolCallMessagePartComponent = (props) => {
  const pending =
    props.approval != null && props.approval.approved === undefined && props.approval.resolution === undefined;

  if (pending) {
    return <NovuApprovalCard {...props} />;
  }

  return <ToolFallback {...props} />;
};

const THREAD_COMPONENTS: ThreadComponents = {
  Banner: WebChatBanner,
  Indicator: WebChatTypingIndicator,
  UserMessage: WebChatUserMessage,
  Composer: WebChatComposer,
  AfterComposer: WebChatEmptyConversationList,
  ToolFallback: NovuToolFallback,
  groupBy: approvalStandaloneGroupBy,
};

function WebChatEmptyConversationList() {
  const { conversations, conversationListFailed, onSelectConversation } = useWebChatUi();

  return (
    <WebChatConversationList
      conversations={conversations}
      failed={conversationListFailed}
      onSelect={onSelectConversation}
    />
  );
}

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
      aria-live="polite"
      aria-label={label}
      label={label}
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
            'text-paragraph-sm text-text-strong rounded-xl px-4 py-2 leading-5 wrap-break-word',
            failed ? 'border-error-light bg-red-alpha-10 border' : 'bg-bg-weak'
          )}
        >
          <MessagePrimitive.Parts />
        </div>
        {failed ? (
          <Button
            type="button"
            variant="error"
            mode="ghost"
            size="2xs"
            className="mt-1 ml-auto flex rounded-full"
            disabled={composerBusy}
            leadingIcon={RiRefreshLine}
            onClick={() => {
              if (novuMessageId) void retryMessage(novuMessageId);
            }}
          >
            Retry
          </Button>
        ) : null}
      </div>
    </MessagePrimitive.Root>
  );
}

function WebChatComposer({ autoFocus }: { autoFocus: boolean }) {
  const { agentName, showAddToAppCallouts, addToAppHref } = useWebChatUi();
  const [showChannelPromo, setShowChannelPromo] = useState(true);

  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      {showChannelPromo ? (
        <div className="border-stroke-soft bg-bg-weak mx-2.5 flex h-8 items-center gap-1 rounded-t-lg border border-b-0 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex min-w-0 flex-1 cursor-default items-center gap-2 px-2 py-1">
                <p className="text-label-xs text-text-sub min-w-0 flex-1 truncate font-medium leading-4">
                  Talk to your agent from wherever you work
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {CHANNEL_PROMO_ICONS.map((icon) => (
                    <img key={icon.label} src={icon.src} alt="" title={icon.label} className="size-3.5" />
                  ))}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
              Your users can natively connect to Slack, Teams, WhatsApp, and more to talk to this agent.
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={() => setShowChannelPromo(false)}
            className="text-text-soft hover:text-text-sub shrink-0"
            aria-label="Dismiss"
          >
            <RiCloseFill className="size-4" />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          'bg-bg-white relative flex min-h-[108px] flex-col overflow-hidden rounded-xl',
          'shadow-[0px_8px_12px_0px_rgba(25,25,25,0.03),0px_2px_6px_0px_rgba(25,25,25,0.03),0px_0px_0px_1px_rgba(42,28,0,0.07)]',
          'transition-[box-shadow] duration-150 ease-out',
          'focus-within:shadow-[0px_8px_12px_0px_rgba(25,25,25,0.03),0px_2px_6px_0px_rgba(25,25,25,0.03),0px_0px_0px_1px_rgba(42,28,0,0.14)]'
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[34px] rounded-b-xl"
          style={PREVIEW_STRIPE_STYLE}
          aria-hidden
        />

        <ComposerPrimitive.Input
          placeholder={`Message ${agentName}...`}
          className="text-text-strong placeholder:text-text-soft relative min-h-[60px] w-full flex-1 resize-none bg-transparent px-4 pt-3 text-[13px] font-medium leading-[1.1] outline-hidden"
          rows={1}
          autoFocus={autoFocus}
          enterKeyHint="send"
          aria-label={`Message ${agentName}`}
        />
        <div className="relative flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex min-w-0 items-center gap-1.5 pl-2">
            <span className="text-warning-base font-code text-xs font-medium uppercase leading-3">Preview</span>
            {showAddToAppCallouts && addToAppHref ? (
              <>
                <span className="bg-text-soft size-0.5 shrink-0 rounded-full" aria-hidden />
                <Link
                  to={addToAppHref}
                  className="text-label-xs text-text-strong hover:text-text-sub truncate font-medium leading-4"
                >
                  Add web chat to your app →
                </Link>
              </>
            ) : null}
          </div>
          <AuiIf condition={(s) => !s.thread.isRunning && !s.thread.isDisabled}>
            <ComposerPrimitive.Send
              render={
                <Button
                  type="button"
                  variant="primary"
                  mode="filled"
                  size="xs"
                  className="size-7 shrink-0 rounded-full p-0"
                  leadingIcon={RiArrowUpLine}
                  aria-label="Send message"
                />
              }
            />
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning || s.thread.isDisabled}>
            <output className="text-text-soft flex size-7 items-center justify-center">
              <RiLoader4Line className="size-4 animate-spin" aria-hidden />
              <span className="sr-only">Agent is responding</span>
            </output>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function LoadOlder() {
  const { pagination } = useWebChatUi();

  const loadOlder = useCallback(async () => {
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
        variant="secondary"
        mode="outline"
        size="2xs"
        className="pointer-events-auto rounded-full"
        onClick={() => void loadOlder()}
        disabled={pagination.status === 'loading'}
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

function WebChatThreadBackButton() {
  const { onShowConversationList } = useWebChatUi();
  const messageCount = useAuiState((state) => state.thread.messages.length);

  if (messageCount === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center px-1 pb-1">
      <WebChatBackToChatsButton onClick={onShowConversationList} />
    </div>
  );
}

export function WebChatThread() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <NovuCardUI />
      <NovuMcpUI />
      <NovuFileUI />
      <WebChatThreadBackButton />
      <div className="relative min-h-0 flex-1">
        <LoadOlder />
        <Thread components={THREAD_COMPONENTS} />
      </div>
    </div>
  );
}
