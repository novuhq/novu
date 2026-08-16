import { NovuProvider, useAgentChat } from '@novu/react';
import { buildDashboardAgentChatSubscriberId } from '@novu/shared';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RiArrowUpLine, RiCodeSSlashLine, RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import {
  ChatEmptyState,
  ChatMessageRow,
  ChatPendingActionCard,
  ChatTypingRow,
} from '@/components/agents/agent-chat-panel/agent-chat-parts';
import { Button } from '@/components/primitives/button';
import { Kbd } from '@/components/primitives/kbd';
import { Skeleton } from '@/components/primitives/skeleton';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { buildRoute } from '@/utils/routes';
import { cn } from '@/utils/ui';

const COMPOSER_MAX_HEIGHT_PX = 128;

type AgentChatPanelProps = {
  agent: AgentResponse;
  agentChatIntegrationIdentifier?: string;
};

export function AgentChatPanel({ agent, agentChatIntegrationIdentifier }: AgentChatPanelProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const testerName = currentUser?.firstName?.trim() || 'yourself';
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
      <div className="flex flex-col gap-3 px-4 py-4 md:px-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[460px] w-full rounded-xl" />
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
      <div className="flex h-[max(560px,calc(100vh-11.25rem))] flex-col px-4 py-4 md:px-6">
        <AgentChatSurface
          agentId={agent.identifier}
          agentName={agent.name}
          testerName={testerName}
          agentChatIntegrationIdentifier={agentChatIntegrationIdentifier}
        />
      </div>
    </NovuProvider>
  );
}

function AgentChatSurface({
  agentId,
  agentName,
  testerName,
  agentChatIntegrationIdentifier,
}: {
  agentId: string;
  agentName: string;
  testerName: string;
  agentChatIntegrationIdentifier?: string;
}) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, pendingActions, sendMessage, respondToAction, error, isRunning, isLoading, typing } = useAgentChat({
    agentId,
  });

  const composerDisabled = isRunning || isLoading;
  const canSend = !composerDisabled && Boolean(draft.trim());
  const isEmpty = messages.length === 0 && !isRunning && !isLoading;
  const lastMessage = messages[messages.length - 1];
  const showTypingRow = Boolean(typing) || (isRunning && lastMessage?.role !== 'assistant');
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
    <div className="border-stroke-soft bg-bg-white flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
      <div className="border-stroke-soft flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
        <p className="text-label-xs text-text-soft min-w-0 truncate">
          Chatting as <span className="text-text-sub font-medium">{testerName}</span>
        </p>
        <AddToAppButton agentId={agentId} integrationIdentifier={agentChatIntegrationIdentifier} />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite">
        {isEmpty ? (
          <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4">
            <ChatEmptyState onPickStarter={handleSend} />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-5 pb-8">
            {messages.map((message, index) => (
              <ChatMessageRow
                key={message.id}
                message={message}
                showAvatar={message.role !== 'user' && messages[index - 1]?.role !== message.role}
              />
            ))}
            {showTypingRow ? <ChatTypingRow status={typing?.status} /> : null}
          </div>
        )}
      </div>

      <div className="relative shrink-0 before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-linear-to-t before:from-bg-white before:to-transparent">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pb-3 pt-3">
          {pendingActions.map((action) => (
            <ChatPendingActionCard
              key={action.id}
              action={action}
              disabled={composerDisabled}
              onRespond={(decision) => void respondToAction({ actionId: action.id, decision })}
            />
          ))}

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
            <div
              className={cn(
                'border-stroke-soft bg-bg-white shadow-xs flex items-end gap-2 rounded-2xl border p-1.5 pl-4',
                'transition-[border-color,box-shadow] duration-150 ease-out',
                'focus-within:border-stroke-sub focus-within:shadow-sm'
              )}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                disabled={isLoading}
                placeholder={`Message ${agentName}...`}
                aria-label={`Message ${agentName}`}
                className="text-paragraph-sm text-text-strong placeholder:text-text-soft min-h-8 w-full flex-1 resize-none bg-transparent py-1.5 leading-5 outline-hidden disabled:cursor-not-allowed"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleSend(draft);
                  }
                }}
              />
              <Button
                type="submit"
                variant="primary"
                mode="filled"
                size="xs"
                className={cn('size-8 shrink-0 rounded-full p-0', isRunning && '[&_svg]:animate-spin')}
                leadingIcon={isRunning ? RiLoader4Line : RiArrowUpLine}
                disabled={!canSend}
                aria-label={isRunning ? 'Agent is responding' : 'Send message'}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-1 px-1">
              <Kbd className="h-4 px-1">Enter</Kbd>
              <span className="text-text-soft text-[11px]">to send</span>
              <span className="text-text-soft text-[11px]" aria-hidden>
                ·
              </span>
              <Kbd className="h-4 px-1">Shift + Enter</Kbd>
              <span className="text-text-soft text-[11px]">for a new line</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddToAppButton({ agentId, integrationIdentifier }: { agentId: string; integrationIdentifier?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();
  const agentRoutes = useAgentRoutes();

  if (!currentEnvironment?.slug) {
    return null;
  }

  const href = integrationIdentifier
    ? `${buildRoute(agentRoutes.integrationDetail, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agentId),
        integrationIdentifier: encodeURIComponent(integrationIdentifier),
      })}${location.search}`
    : `${buildRoute(agentRoutes.detailsTab, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agentId),
        agentTab: 'integrations',
      })}${location.search}`;

  return (
    <Button
      type="button"
      variant="secondary"
      mode="outline"
      size="2xs"
      className="shrink-0"
      leadingIcon={RiCodeSSlashLine}
      onClick={() => void navigate(href)}
    >
      Add to your app
    </Button>
  );
}
