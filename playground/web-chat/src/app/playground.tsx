'use client';

/**
 * Playground shell — provider, session switching, debug tools.
 *
 * For the `useWebChat` recipe, open `src/components/web-chat.tsx`.
 */

import { NovuProvider } from '@novu/react';
import { useCallback } from 'react';
import { WebChat } from '../components/web-chat';
import { ConnectionTracker } from '../components/connection-tracker';
import { DebugInspector, SdkEventBridge, useDebugLog } from '../components/debug-inspector';
import { SessionSidebar } from '../components/session-sidebar';
import { config, missingEnvVars } from '../config';
import { usePlaygroundSession } from '../hooks/use-playground-session';
import { useSocketStatus } from '../hooks/use-socket-status';
import { useConversations } from '../lib/conversations';
import { installNetworkInspector } from '../lib/debug-events';

// Patch fetch/WebSocket before the Novu SDK makes its first request.
installNetworkInspector([config.backendUrl, config.socketUrl]);

function PlaygroundApp() {
  const { events, clear } = useDebugLog();
  const socketStatus = useSocketStatus();
  const session = usePlaygroundSession();
  const conversations = useConversations(config.backendUrl);

  const reloadConversations = useCallback(() => {
    void conversations.reload();
  }, [conversations.reload]);

  return (
    <div className="shell">
      <ConnectionTracker />
      <SdkEventBridge />
      <main className="workbench">
        <WebChat
          key={session.sessionKey}
          conversationId={session.conversationId}
          onAssistantMessage={reloadConversations}
          sidebar={(chat) => (
            <SessionSidebar
              agentId={config.agentId}
              conversationId={chat.conversationId}
              subscriberId={config.subscriberId}
              backendUrl={config.backendUrl}
              socketUrl={config.socketUrl}
              resumeDraft={session.resumeDraft}
              onResumeDraftChange={session.setResumeDraft}
              onResume={session.onResume}
              onNewChat={session.onNewChat}
              isRunning={chat.isRunning}
              runOrigin={chat.runOrigin}
              lastRunTransition={chat.lastRunTransition}
              conversationStatus={chat.conversationStatus}
              socketStatus={socketStatus}
              pendingApprovalCount={chat.pendingApprovalCount}
              conversations={conversations.items}
              conversationsLoading={conversations.isLoading}
              conversationsError={conversations.error}
              onSelectConversation={session.onSelectConversation}
              onReloadConversations={reloadConversations}
            />
          )}
        />
        <DebugInspector events={events} onClear={clear} />
      </main>
    </div>
  );
}

export function WebChatPlayground() {
  const missing = missingEnvVars();

  if (missing.length > 0) {
    return (
      <div className="env-error">
        Missing env: {missing.join(', ')}. Copy <code>.env.example</code> → <code>.env</code>.
      </div>
    );
  }

  return (
    <NovuProvider
      applicationIdentifier={config.applicationIdentifier}
      subscriberId={config.subscriberId}
      backendUrl={config.backendUrl}
      socketUrl={config.socketUrl}
      socketOptions={config.socketType ? { socketType: config.socketType } : undefined}
      subscriberHash={config.subscriberHash}
    >
      <PlaygroundApp />
    </NovuProvider>
  );
}
