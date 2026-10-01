import { NovuProvider, useWebChat } from '@novu/react';
import { buildDashboardWebChatSubscriberId } from '@novu/shared';
import { useMemo, useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import { WebChatThread } from '@/components/agents/web-chat-panel/assistant-ui/thread';
import { WebChatRuntimeProvider } from '@/components/agents/web-chat-panel/assistant-ui/web-chat-runtime';
import { useWebChatConversationList } from '@/components/agents/web-chat-panel/use-web-chat-conversation-list';
import { Skeleton } from '@/components/primitives/skeleton';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

type WebChatPanelProps = {
  agent: AgentResponse;
  showAddToAppCallouts?: boolean;
  addToAppHref?: string;
};

export function WebChatPanel(props: WebChatPanelProps) {
  const { currentEnvironment } = useEnvironment();

  return <WebChatPanelInner key={`${props.agent.identifier}:${currentEnvironment?._id ?? ''}`} {...props} />;
}

function WebChatPanelInner({ agent, showAddToAppCallouts = false, addToAppHref }: WebChatPanelProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const testerSubscriberId = currentUser?._id ? buildDashboardWebChatSubscriberId(currentUser._id) : '';
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
  const [resumeId, setResumeId] = useState<string | undefined>();

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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WebChatSurface
          agentId={agent.identifier}
          agentName={agent.name}
          conversationId={resumeId}
          showAddToAppCallouts={showAddToAppCallouts}
          addToAppHref={addToAppHref}
          onSelectConversation={setResumeId}
          onNewChat={() => setResumeId(undefined)}
          environmentIdentifier={currentEnvironment.identifier}
          subscriberId={testerSubscriberId}
        />
      </div>
    </NovuProvider>
  );
}

function WebChatSurface({
  agentId,
  agentName,
  conversationId,
  showAddToAppCallouts,
  addToAppHref,
  onSelectConversation,
  onNewChat,
  environmentIdentifier,
  subscriberId,
}: {
  agentId: string;
  agentName: string;
  conversationId?: string;
  showAddToAppCallouts: boolean;
  addToAppHref?: string;
  onSelectConversation: (identifier: string) => void;
  onNewChat: () => void;
  environmentIdentifier: string;
  subscriberId: string;
}) {
  const {
    items: conversations,
    failed: conversationListFailed,
    reload,
  } = useWebChatConversationList(agentId, environmentIdentifier, subscriberId);
  const {
    messages,
    pendingActions,
    sendMessage,
    respondToAction,
    sendAction,
    retryMessage,
    conversationId: activeConversationId,
    error,
    isRunning,
    isLoading,
    pagination,
    isRecovering,
    catchUpError,
    refetch,
    typing,
    startNewConversation,
  } = useWebChat({
    agentId,
    conversationId,
    onMessage: (message) => {
      if (message.role === 'assistant') {
        reload();
      }
    },
  });

  const composerBusy = messages.some((message) => message.status === 'sending') || isRunning;
  const bannerDetail =
    catchUpError?.message ?? (messages.some((m) => m.status === 'failed') ? undefined : error?.message);
  const ui = useMemo(
    () => ({
      sendAction,
      retryMessage,
      pagination,
      typingLabel: typing?.status,
      pendingActionCount: pendingActions.length,
      agentName,
      showAddToAppCallouts,
      addToAppHref,
      conversations,
      conversationListFailed,
      onSelectConversation,
      onShowConversationList: () => {
        onNewChat();
        startNewConversation();
      },
      banner: bannerDetail
        ? {
            title: catchUpError ? "Couldn't sync missed messages" : 'Something went wrong',
            detail: bannerDetail,
            ...(activeConversationId != null ? { onRetry: () => void refetch() } : null),
          }
        : undefined,
    }),
    [
      sendAction,
      retryMessage,
      pagination,
      typing?.status,
      pendingActions.length,
      agentName,
      showAddToAppCallouts,
      addToAppHref,
      conversations,
      conversationListFailed,
      onSelectConversation,
      onNewChat,
      startNewConversation,
      bannerDetail,
      catchUpError,
      activeConversationId,
      refetch,
    ]
  );

  return (
    <WebChatRuntimeProvider
      chat={{ messages, isRunning, isLoading, sendMessage, respondToAction }}
      composerBusy={composerBusy}
      ui={ui}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col">
          {isRecovering ? (
            <div className="absolute top-3 left-1/2 z-20 w-[calc(100%-24px)] -translate-x-1/2">
              <output className="border-stroke-soft bg-bg-white/90 text-text-sub text-label-xs block rounded-lg border px-3 py-2 text-center shadow-xs backdrop-blur">
                Syncing missed messages…
              </output>
            </div>
          ) : null}
          <WebChatThread />
        </div>
      </div>
    </WebChatRuntimeProvider>
  );
}
