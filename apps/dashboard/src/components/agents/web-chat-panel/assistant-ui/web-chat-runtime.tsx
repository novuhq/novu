import {
  type AppendMessage,
  AssistantRuntimeProvider,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from '@assistant-ui/react';
import type { AgentMessage, UseWebChatResult } from '@novu/react';
import { type ReactNode, useCallback, useMemo } from 'react';
import { agentMessageToThreadMessage, textFromAppendContent } from './agent-message-to-thread-message';
import { decisionFromApprovalOption } from './approval-options';
import { type WebChatUiActions, WebChatUiProvider } from './web-chat-actions';

type Chat = Pick<UseWebChatResult, 'messages' | 'isRunning' | 'isLoading' | 'sendMessage' | 'respondToAction'>;

type Ui = Omit<WebChatUiActions, 'respondToAction' | 'composerBusy'>;

export function WebChatRuntimeProvider({
  chat,
  composerBusy,
  ui,
  children,
}: {
  chat: Chat;
  composerBusy: boolean;
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

  const runtime = useExternalStoreRuntime({
    messages: convertedMessages,
    isRunning: chat.isRunning,
    isLoading: chat.isLoading,
    isDisabled: composerBusy,
    onNew,
    onRespondToToolApproval,
    suggestions: [{ prompt: 'Hello' }, { prompt: 'What can you do?' }, { prompt: 'What tools do you have available?' }],
  });

  const uiValue = useMemo<WebChatUiActions>(
    () => ({
      ...ui,
      respondToAction: chat.respondToAction,
      composerBusy,
    }),
    [ui, chat.respondToAction, composerBusy]
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WebChatUiProvider value={uiValue}>{children}</WebChatUiProvider>
    </AssistantRuntimeProvider>
  );
}
