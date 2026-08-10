'use client';

import type { AgentMessage } from '@novu/react';
import { NovuProvider, useAgentChat, useNovu } from '@novu/react';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppHeader } from '../components/app-header';
import { ApprovalDock } from '../components/approval-dock';
import { ChatThread } from '../components/chat-thread';
import { Composer } from '../components/composer';
import { DebugInspector, SdkEventBridge, useDebugLog } from '../components/debug-inspector';
import { SessionSidebar } from '../components/session-sidebar';
import { setApiToken } from '../lib/api-token';
import { useApprovalAlert } from '../lib/approval-alert';
import { type ConversationSummary, useConversations } from '../lib/conversations';
import { installNetworkInspector } from '../lib/debug-events';
import { getSocketStatus, setSocketStatus, subscribeSocketStatus } from '../lib/socket-status';

const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '';
const subscriberId = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '';
const agentId = process.env.NEXT_PUBLIC_NOVU_AGENT_ID ?? '';
const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000';
const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://127.0.0.1:8787';
const socketType = process.env.NEXT_PUBLIC_NOVU_SOCKET_TYPE as 'cloud' | 'self-hosted' | undefined;
const subscriberHash = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_HASH;

// Patch fetch/WebSocket before the Novu SDK makes its first request.
installNetworkInspector([backendUrl, socketUrl]);

function missingEnv(): string[] {
  const missing: string[] = [];
  if (!applicationIdentifier) missing.push('NEXT_PUBLIC_NOVU_APP_ID');
  if (!subscriberId) missing.push('NEXT_PUBLIC_NOVU_SUBSCRIBER_ID');
  if (!agentId) missing.push('NEXT_PUBLIC_NOVU_AGENT_ID');
  return missing;
}

/**
 * The socket status store is the source of truth because it also sees `close`.
 * These SDK events only cover the connect attempt itself.
 */
function ConnectionTracker() {
  const novu = useNovu();

  useEffect(() => {
    const cleanupPending = novu.on('socket.connect.pending', () => setSocketStatus('connecting'));
    const cleanupResolved = novu.on('socket.connect.resolved', ({ error }) =>
      setSocketStatus(error ? 'offline' : 'online')
    );
    // The recent list calls an endpoint the SDK does not wrap, so it needs this token.
    const cleanupSession = novu.on('session.initialize.resolved', ({ data }) => {
      if (data?.token) setApiToken(data.token);
    });

    return () => {
      cleanupPending();
      cleanupResolved();
      cleanupSession();
    };
  }, [novu]);

  return null;
}

function useSocketStatus() {
  return useSyncExternalStore(subscribeSocketStatus, getSocketStatus, () => 'connecting' as const);
}

type ChatSurfaceProps = {
  conversationId?: string;
  resumeDraft: string;
  onResumeDraftChange: (value: string) => void;
  onResume: () => void;
  onNewChat: () => void;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  conversationsError?: string;
  onSelectConversation: (identifier: string) => void;
  onReloadConversations: () => void;
};

function ChatSurface({
  conversationId,
  resumeDraft,
  onResumeDraftChange,
  onResume,
  onNewChat,
  conversations,
  conversationsLoading,
  conversationsError,
  onSelectConversation,
  onReloadConversations,
}: ChatSurfaceProps) {
  const onApprovalRequested = useApprovalAlert();

  // Titles are minted server-side after the first exchange, so refresh on each reply.
  const onMessage = useCallback(
    (message: AgentMessage) => {
      if (message.role === 'assistant') onReloadConversations();
    },
    [onReloadConversations]
  );

  const {
    messages,
    pendingApprovals,
    sendMessage,
    respondToApproval,
    conversationId: activeConversationId,
    error,
    isRunning,
    typing,
    status,
    isLoading,
    isFetching,
    hasMore,
    fetchMore,
  } = useAgentChat({ agentId, conversationId, onApprovalRequested, onMessage });
  const [pending, setPending] = useState(false);

  const onSend = useCallback(
    async (text: string) => {
      setPending(true);

      try {
        await sendMessage(text);
      } finally {
        setPending(false);
      }
    },
    [sendMessage]
  );

  const composerDisabled = pending || isRunning || isLoading;

  return (
    <>
      <SessionSidebar
        agentId={agentId}
        conversationId={activeConversationId}
        subscriberId={subscriberId}
        backendUrl={backendUrl}
        socketUrl={socketUrl}
        resumeDraft={resumeDraft}
        onResumeDraftChange={onResumeDraftChange}
        onResume={onResume}
        onNewChat={onNewChat}
        isRunning={isRunning}
        status={status}
        pendingApprovalCount={pendingApprovals.length}
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        conversationsError={conversationsError}
        onSelectConversation={onSelectConversation}
        onReloadConversations={onReloadConversations}
      />

      <section className="panel chat-panel" aria-label="Chat">
        {error ? (
          <div className="banner-error" role="alert">
            {error.message}
          </div>
        ) : null}
        <ChatThread
          messages={messages}
          isRunning={isRunning}
          typing={typing}
          hasMore={hasMore}
          isFetching={isFetching}
          onFetchMore={fetchMore}
          onRespond={respondToApproval}
        />
        <ApprovalDock approvals={pendingApprovals} />
        <Composer
          pending={composerDisabled}
          conversationId={activeConversationId}
          isRunning={isRunning}
          onSend={onSend}
        />
      </section>
    </>
  );
}

function PlaygroundApp() {
  const { events, clear } = useDebugLog();
  const socketStatus = useSocketStatus();
  const [sessionKey, setSessionKey] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [resumeDraft, setResumeDraft] = useState('');

  const onNewChat = useCallback(() => {
    setConversationId(undefined);
    setResumeDraft('');
    setSessionKey((key) => key + 1);
  }, []);

  const onResume = useCallback(() => {
    const id = resumeDraft.trim();
    if (!id) return;
    setConversationId(id);
    setSessionKey((key) => key + 1);
  }, [resumeDraft]);

  const { items, isLoading, error, reload } = useConversations(backendUrl);

  const onSelectConversation = useCallback((identifier: string) => {
    setConversationId(identifier);
    setResumeDraft(identifier);
    setSessionKey((key) => key + 1);
  }, []);

  const onReloadConversations = useCallback(() => {
    void reload();
  }, [reload]);

  return (
    <div className="shell">
      <ConnectionTracker />
      <SdkEventBridge />
      <AppHeader state={socketStatus} />
      <main className="workbench">
        <ChatSurface
          key={sessionKey}
          conversationId={conversationId}
          resumeDraft={resumeDraft}
          onResumeDraftChange={setResumeDraft}
          onResume={onResume}
          onNewChat={onNewChat}
          conversations={items}
          conversationsLoading={isLoading}
          conversationsError={error}
          onSelectConversation={onSelectConversation}
          onReloadConversations={onReloadConversations}
        />
        <DebugInspector events={events} onClear={clear} />
      </main>
    </div>
  );
}

export function AgentChatPlayground() {
  const missing = missingEnv();

  if (missing.length > 0) {
    return (
      <div className="env-error">
        Missing env: {missing.join(', ')}. Copy <code>.env.example</code> → <code>.env</code>.
      </div>
    );
  }

  return (
    <NovuProvider
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      backendUrl={backendUrl}
      socketUrl={socketUrl}
      socketOptions={socketType ? { socketType } : undefined}
      subscriberHash={subscriberHash}
    >
      <PlaygroundApp />
    </NovuProvider>
  );
}
