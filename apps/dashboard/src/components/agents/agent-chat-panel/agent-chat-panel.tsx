import { NovuProvider, useAgentChat } from '@novu/react';
import { buildDashboardAgentChatSubscriberId } from '@novu/shared';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RiArrowUpLine, RiCloseFill, RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { ChatEmptyState, ChatMessageRow, ChatTypingRow } from '@/components/agents/agent-chat-panel/agent-chat-parts';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { cn } from '@/utils/ui';

const COMPOSER_MAX_HEIGHT_PX = 128;

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

type AgentChatPanelProps = {
  agent: AgentResponse;
  showAddToAppCallouts?: boolean;
  addToAppHref?: string;
};

export function AgentChatPanel({ agent, showAddToAppCallouts = false, addToAppHref }: AgentChatPanelProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const testerSubscriberId = currentUser?._id ? buildDashboardAgentChatSubscriberId(currentUser._id) : '';
  const isReady = isUserLoaded && Boolean(testerSubscriberId) && Boolean(currentEnvironment?.identifier);
  const subscriber = useMemo(
    () => ({
      subscriberId: testerSubscriberId,
      firstName: currentUser?.firstName ?? '',
      lastName: currentUser?.lastName ?? '',
      email: currentUser?.email ?? '',
      avatar: currentUser?.profilePicture ?? '',
    }),
    [testerSubscriberId, currentUser?.firstName, currentUser?.lastName, currentUser?.email, currentUser?.profilePicture]
  );

  if (!isReady || !currentEnvironment) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }

  return (
    <NovuProvider
      key={testerSubscriberId}
      subscriber={subscriber}
      applicationIdentifier={currentEnvironment.identifier}
      apiUrl={apiHostnameManager.getHostname()}
      socketUrl={apiHostnameManager.getWebSocketHostname()}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <AgentChatSurface
          agentId={agent.identifier}
          agentName={agent.name}
          showAddToAppCallouts={showAddToAppCallouts}
          addToAppHref={addToAppHref}
        />
      </div>
    </NovuProvider>
  );
}

function AgentChatSurface({
  agentId,
  agentName,
  showAddToAppCallouts,
  addToAppHref,
}: {
  agentId: string;
  agentName: string;
  showAddToAppCallouts: boolean;
  addToAppHref?: string;
}) {
  const [draft, setDraft] = useState('');
  const [showChannelPromo, setShowChannelPromo] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, pendingActions, sendMessage, sendAction, respondToAction, error, isRunning, isLoading, typing } =
    useAgentChat({
      agentId,
    });

  const composerDisabled = isRunning || isLoading;
  const canSend = !composerDisabled && Boolean(draft.trim());
  const isEmpty = messages.length === 0 && !isRunning && !isLoading;
  const lastMessage = messages[messages.length - 1];
  const showTypingRow = (Boolean(typing) || isRunning) && pendingActions.length === 0;
  const lastMessageSignature = lastMessage
    ? `${lastMessage.id}:${lastMessage.parts.map((part) => (part.type === 'text' ? part.text : part.type)).join('\0')}`
    : '';

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the draft changes
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, [draft]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the transcript changes
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isEmpty) return;

    el.scrollTop = el.scrollHeight;
  }, [isEmpty, isLoading, messages.length, lastMessageSignature, showTypingRow]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || composerDisabled) return;

    setDraft('');
    void sendMessage(trimmed);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite">
        {isEmpty ? (
          <div className="flex h-full w-full flex-col">
            <ChatEmptyState onPickStarter={handleSend} />
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 px-4 pt-4 pb-6">
            {messages.map((message) => (
              <ChatMessageRow
                key={message.id}
                message={message}
                showAvatar={false}
                cardActionsDisabled={composerDisabled}
                onCardAction={(action) => void sendAction(action)}
                onRespondToAction={(action) => void respondToAction(action)}
              />
            ))}
            {showTypingRow ? <ChatTypingRow status={typing?.status} /> : null}
          </div>
        )}
      </div>

      <div className="relative shrink-0 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-linear-to-t before:from-bg-white before:to-transparent">
        <div className="flex flex-col gap-2 pb-3 pt-2">
          {error ? (
            <div
              className="border-error-light bg-red-alpha-10 text-error-base text-label-xs flex items-center gap-2 rounded-lg border px-3 py-2"
              role="alert"
            >
              <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{error.message}</span>
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend(draft);
            }}
          >
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

              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                disabled={isLoading}
                placeholder={`Message ${agentName}...`}
                aria-label={`Message ${agentName}`}
                className="text-[13px] text-text-strong placeholder:text-text-soft relative min-h-[60px] w-full flex-1 resize-none bg-transparent px-4 pt-3 font-medium leading-[1.1] outline-hidden disabled:cursor-not-allowed"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleSend(draft);
                  }
                }}
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
                <Button
                  type="submit"
                  variant="primary"
                  mode="filled"
                  size="xs"
                  className={cn(
                    'size-7 shrink-0 rounded-full p-0',
                    isRunning && '[&_svg]:animate-spin',
                    !canSend &&
                      'bg-[linear-gradient(90deg,rgba(42,28,0,0.07),rgba(42,28,0,0.07)),linear-gradient(90deg,#fff,#fff)] text-text-soft opacity-40 shadow-none hover:bg-[linear-gradient(90deg,rgba(42,28,0,0.07),rgba(42,28,0,0.07)),linear-gradient(90deg,#fff,#fff)]'
                  )}
                  leadingIcon={isRunning ? RiLoader4Line : RiArrowUpLine}
                  disabled={!canSend}
                  aria-label={isRunning ? 'Agent is responding' : 'Send message'}
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
