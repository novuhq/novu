'use client';

import type { AgentMessage, UseWebChatResult } from '@novu/react';
import {
  AssistantRuntimeProvider,
  useExternalMessageConverter,
  useExternalStoreRuntime,
  type AppendMessage,
  type ExternalStoreThreadData,
  type ExternalStoreThreadListAdapter,
} from '@assistant-ui/react';
import { useCallback, useMemo, type ReactNode } from 'react';
import { decisionFromApprovalOption } from '../../lib/approval-options';
import { agentMessageToThreadMessage, textFromAppendContent } from '../../lib/agent-message-to-thread-message';
import { WebChatUiProvider, type WebChatUiActions } from './web-chat-actions';

type Chat = Pick<
  UseWebChatResult,
  'messages' | 'isRunning' | 'isLoading' | 'sendMessage' | 'respondToAction'
>;

export type WebChatThreadListConfig = {
  threadId: string;
  threads: readonly ExternalStoreThreadData<'regular'>[];
  isLoading: boolean;
  onSwitchToThread: (threadId: string) => void;
  onSwitchToNewThread: () => void;
};

type Ui = Omit<WebChatUiActions, 'respondToAction' | 'composerBusy'>;

export function WebChatRuntimeProvider({
  chat,
  composerBusy,
  threadList,
  ui,
  children,
}: {
  chat: Chat;
  composerBusy: boolean;
  threadList?: WebChatThreadListConfig;
  ui: Ui;
  children: ReactNode;
}) {
  const convertedMessages = useExternalMessageConverter<AgentMessage>({
    callback: agentMessageToThreadMessage,
    messages: chat.messages,
    isRunning: chat.isRunning,
    joinStrategy: 'none',
  });

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = textFromAppendContent(message.content).trim();
      if (!text) return;
      await chat.sendMessage(text);
    },
    [chat.sendMessage]
  );

  const onRespondToToolApproval = useCallback(
    async (options: { approvalId: string; approved: boolean; optionId?: string }) => {
      await chat.respondToAction({
        approvalId: options.approvalId,
        decision: decisionFromApprovalOption(options.optionId, options.approved),
      });
    },
    [chat.respondToAction]
  );

  const threadListAdapter = useMemo<ExternalStoreThreadListAdapter | undefined>(() => {
    if (!threadList) return undefined;

    return {
      threadId: threadList.threadId,
      threads: threadList.threads,
      isLoading: threadList.isLoading,
      onSwitchToThread: threadList.onSwitchToThread,
      onSwitchToNewThread: threadList.onSwitchToNewThread,
    };
  }, [threadList]);

  const runtime = useExternalStoreRuntime({
    messages: convertedMessages,
    isRunning: chat.isRunning,
    isLoading: chat.isLoading,
    isDisabled: composerBusy,
    onNew,
    onRespondToToolApproval,
    suggestions: [
      { prompt: 'Hello' },
      { prompt: 'What can you do?' },
      { prompt: 'What tools do you have available?' },
    ],
    adapters: threadListAdapter ? { threadList: threadListAdapter } : undefined,
  });

  const uiValue = useMemo<WebChatUiActions>(
    () => ({
      ...ui,
      respondToAction: chat.respondToAction,
      composerBusy,
    }),
    [ui, chat.respondToAction, composerBusy],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WebChatUiProvider value={uiValue}>{children}</WebChatUiProvider>
    </AssistantRuntimeProvider>
  );
}
