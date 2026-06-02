import { AiAgentTypeEnum, AiMessageRoleEnum, AiResourceTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { useQueryClient } from '@tanstack/react-query';
import { ChatStatus, DataUIPart, DynamicToolUIPart, UIMessage } from 'ai';
import { createContext, FC, SVGProps, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IconType } from 'react-icons';
import { useLocation } from 'react-router-dom';
import { cancelStream } from '@/api/ai';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { useEnvironment } from '@/context/environment/hooks';
import { useAiChatStream } from '@/hooks/use-ai-chat-stream';
import { useCreateAiChat } from '@/hooks/use-create-ai-chat';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFetchLatestAiChat } from '@/hooks/use-fetch-latest-ai-chat';
import { useKeepAiChanges } from '@/hooks/use-keep-ai-changes';
import { useRevertMessage } from '@/hooks/use-revert-message';
import { useTelemetry } from '@/hooks/use-telemetry';
import { QueryKeys } from '@/utils/query-keys';
import { TelemetryEvent } from '@/utils/telemetry';
import { showErrorToast } from '../primitives/sonner-helpers';
import { isCancelledToolCall } from './message-utils';

export type ReasoningDataPart = DataUIPart<{ reasoning: { toolCallId: string; text: string } }>;

export type AiChatContextValue = {
  hasNoChatHistory: boolean;
  lastUserMessageId?: string;
  messages: UIMessage[];
  dataParts: ReasoningDataPart[];
  status: ChatStatus;
  error?: Error | null;
  handleStop: () => Promise<void>;
  isGenerating: boolean;
  isLoading: boolean;
  isCreatingChat: boolean;
  isActionPending: boolean;
  isReviewingChanges: boolean;
  inputText: string;
  newChatSuggestions?: { label: string; icon: IconType | FC<SVGProps<SVGSVGElement>> }[];
  setInputText: (text: string) => void;
  handleSendMessage: (message: string) => Promise<void>;
  handleKeepAll: () => Promise<void>;
  handleTryAgain: (messageId: string) => Promise<void>;
  handleRevertMessage: (messageId: string) => Promise<void>;
  handleDiscard: (messageId: string) => Promise<void>;
  handleSuggestionClick: (suggestion: string) => void;
};

export type AiChatResourceConfig = {
  resourceType: AiResourceTypeEnum;
  resourceId?: string;
  newChatSuggestions?: { label: string; icon: IconType | FC<SVGProps<SVGSVGElement>> }[];
  agentType: AiAgentTypeEnum;
  metadata?: Record<string, unknown>;
  isResourceLoading?: boolean;
  onRefetchResource?: () => void;
  onData?: (data: { type: string }) => void;
  onKeepSuccess?: () => void;
  onKeepError?: () => void;
  firstMessageRevert?: {
    renderDialog: (props: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onConfirm: () => Promise<void>;
    }) => React.ReactNode;
    onConfirm: () => Promise<void>;
  };
};

const AiChatContext = createContext<AiChatContextValue | null>(null);

/**
 * Strip incomplete tool-call parts and step-start markers from all assistant messages.
 * Dangling parts are kept in the DB (so toUIMessageStream can match them to the correct
 * assistant message via the values stream), but hidden from the user in the UI.
 */
const cleanupIncompleteToolCalls = <T extends UIMessage>(currentMessages: T[]): T[] => {
  let changed = false;

  const result = currentMessages.reduce<T[]>((acc, msg) => {
    if (msg.role !== 'assistant') {
      acc.push(msg);

      return acc;
    }

    const cleanedParts = msg.parts.filter((part) => {
      if (part.type === 'step-start') return false;
      if (part.type.startsWith('dynamic-tool')) {
        const tool = part as DynamicToolUIPart;
        if (isCancelledToolCall(tool)) return false;

        return tool.state === 'output-available' || tool.state === 'output-error';
      }

      return true;
    });

    if (cleanedParts.length !== msg.parts.length) {
      changed = true;
    }

    const hasContent = cleanedParts.some(
      (p) =>
        p.type === 'text' ||
        (p.type.startsWith('dynamic-tool') &&
          !isCancelledToolCall(p as DynamicToolUIPart) &&
          ((p as DynamicToolUIPart).state === 'output-available' || (p as DynamicToolUIPart).state === 'output-error'))
    );

    if (hasContent) {
      acc.push(changed ? ({ ...msg, parts: cleanedParts } as T) : msg);
    } else {
      changed = true;
    }

    return acc;
  }, []);

  return changed ? result : currentMessages;
};

export function AiChatProvider({ children, config }: { children: React.ReactNode; config: AiChatResourceConfig }) {
  const {
    resourceType,
    resourceId,
    newChatSuggestions,
    agentType,
    metadata,
    isResourceLoading = false,
    onRefetchResource,
    onData,
    onKeepSuccess,
    onKeepError,
    firstMessageRevert,
  } = config;

  const track = useTelemetry();
  const [inputText, setInputText] = useState('');
  const [isFirstMessageRevertDialogOpen, setFirstMessageRevertDialogOpen] = useState(false);
  const [pendingRevertAction, setPendingRevertAction] = useState<{
    type: 'revert' | 'tryAgain';
    messageId: string;
  } | null>(null);
  const isMountedRef = useRef(false);
  const hasHandledInitialResumeRef = useRef(false);
  const isStoppingRef = useRef(false);
  const skipMessageSyncRef = useRef(false);
  const pendingSendRef = useRef<{ chatId: string; prompt: string; metadata: Record<string, unknown> } | null>(null);
  const location = useLocation();
  const { areEnvironmentsInitialLoading, currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const {
    latestChat,
    isPending: isFetchingAiChat,
    refetch: refetchLatestChat,
  } = useFetchLatestAiChat({
    resourceType,
    resourceId,
  });
  const hasNoChatHistory = !latestChat;
  const { createAiChat, isPending: isCreatingAiChat } = useCreateAiChat();

  const chatId = useMemo(() => {
    if (location.state && 'chatId' in location.state) {
      return location.state.chatId as string;
    }

    return latestChat?._id;
  }, [location, latestChat]);

  const { setMessages, sendPrompt, stop, status, isGenerating, messages, dataParts, isAborted, resume, error } =
    useAiChatStream<{
      reasoning: { toolCallId: string; text: string };
    }>({
      id: chatId,
      agentType,
      onData: async (data) => {
        const dataType = (data as { type: string }).type;
        if (isMountedRef.current && onData) {
          onData({ type: dataType });
        }
      },
      onFinish: ({ isAbort, isDisconnect, isError, messages }) => {
        setMessages(cleanupIncompleteToolCalls(messages));

        if (isAbort || isDisconnect || isError) {
          return;
        }

        track(TelemetryEvent.COPILOT_GENERATION_COMPLETED, {
          chatId,
          agentType,
          resourceType,
          messageCount: messages.length,
        });

        skipMessageSyncRef.current = true;
        refetchLatestChat();
      },
      onError: (err) => {
        track(TelemetryEvent.COPILOT_GENERATION_ERROR, {
          chatId,
          agentType,
          resourceType,
        });
        Sentry.captureException(err, {
          tags: { feature: 'ai-copilot', action: 'stream-error', agentType, resourceType },
          extra: { chatId },
        });
      },
    });
  const dataRef = useDataRef({
    currentEnvironment,
    isGenerating,
    resourceType,
    resourceId,
    agentType,
    isAborted,
    latestChat,
    messages,
    metadata,
  });

  const { keepChanges, isPending: isKeepPending } = useKeepAiChanges();
  const { revertMessage, isPending: isRevertPending } = useRevertMessage();

  const isActionPending = isKeepPending || isRevertPending;

  useEffect(() => {
    if (!latestChat || isGenerating || isStoppingRef.current) {
      return;
    }

    if (skipMessageSyncRef.current) {
      skipMessageSyncRef.current = false;

      return;
    }

    const latestChatMessages = latestChat.messages as typeof messages;
    setMessages(cleanupIncompleteToolCalls(latestChatMessages));
  }, [latestChat, isGenerating, setMessages]);

  useEffect(() => {
    if (latestChat && !hasHandledInitialResumeRef.current) {
      hasHandledInitialResumeRef.current = true;

      const { agentType, resourceType } = dataRef.current;
      if (latestChat.activeStreamId) {
        track(TelemetryEvent.COPILOT_CHAT_RESUMED, {
          chatId: latestChat._id,
          agentType,
          resourceType,
        });
        resume();
      }
    }
  }, [latestChat, resume, track, dataRef]);

  useEffect(() => {
    if (chatId && pendingSendRef.current && chatId === pendingSendRef.current.chatId) {
      const pending = pendingSendRef.current;
      pendingSendRef.current = null;
      sendPrompt({ chatId: pending.chatId, prompt: pending.prompt, metadata: pending.metadata });
    }
  }, [chatId, sendPrompt]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (dataRef.current.isGenerating) {
        stop();
      }
    };
  }, [dataRef, stop]);

  const lastUserMessageId = useMemo(() => {
    const userMessages = messages.filter((m) => m.role === AiMessageRoleEnum.USER);

    return userMessages.length > 0 ? userMessages[userMessages.length - 1].id : undefined;
  }, [messages]);

  const isReviewingChanges = useMemo(() => {
    if (!latestChat) return false;

    return latestChat.hasPendingChanges;
  }, [latestChat]);

  const isFirstUserMessage = useMemo(() => {
    return messages.length === 1 && messages[0].role === AiMessageRoleEnum.USER;
  }, [messages]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      const { resourceType, resourceId, agentType, latestChat, messages, metadata, currentEnvironment } =
        dataRef.current;
      const isLastUserMessage = messages.length > 0 && messages[messages.length - 1].role === AiMessageRoleEnum.USER;

      const messageToSend = message.trim();
      if (!messageToSend) return;

      if (!latestChat) {
        const newChat = await createAiChat({ resourceType, resourceId });
        queryClient.setQueryData([QueryKeys.fetchChat, currentEnvironment?._id, resourceType, resourceId], newChat);
        track(TelemetryEvent.COPILOT_CHAT_CREATED, {
          chatId: newChat._id,
          resourceType,
          agentType,
        });
        // we don't pre-create the chat until the user sends a message and the useAiChatStream hook uses the autogenerated chatId
        // if we update the chatId right away here, the useAiChatStream hook will reset its state and the user sent message and stream will be lost
        // defer sending the message to the stream until the chat is created and chatId is updated for the useAiChatStream hook
        pendingSendRef.current = { chatId: newChat._id, prompt: messageToSend, metadata: { ...metadata } };
      } else if (isLastUserMessage) {
        const lastUserMessage = messages.filter((m) => m.role === AiMessageRoleEnum.USER).pop();
        sendPrompt({
          messageId: lastUserMessage?.id,
          chatId: latestChat._id,
          prompt: messageToSend,
          metadata: { ...metadata },
        });
      } else if (messageToSend) {
        sendPrompt({ chatId: latestChat._id, prompt: messageToSend, metadata: { ...metadata } });
      }

      track(TelemetryEvent.COPILOT_MESSAGE_SENT, {
        resourceType,
        agentType,
        isNewChat: !latestChat,
        messageLength: messageToSend.length,
      });

      setInputText('');
    },
    [dataRef, queryClient, createAiChat, sendPrompt, track]
  );

  const handleKeepAll = useCallback(async () => {
    if (!lastUserMessageId || !latestChat) return;

    const { agentType, resourceType } = dataRef.current;

    await keepChanges(
      { chatId: latestChat._id, messageId: lastUserMessageId },
      {
        onSuccess: () => {
          track(TelemetryEvent.COPILOT_CHANGES_KEPT, {
            chatId: latestChat._id,
            agentType,
            resourceType,
            userMessageId: lastUserMessageId,
          });
          refetchLatestChat();
          onKeepSuccess?.();
        },
        onError: (err) => {
          Sentry.captureException(err, {
            tags: { feature: 'ai-copilot', action: 'keep-changes', agentType, resourceType },
            extra: { chatId: latestChat._id },
          });
          onKeepError?.();
        },
      }
    );
  }, [latestChat, lastUserMessageId, keepChanges, refetchLatestChat, onKeepSuccess, onKeepError, track, dataRef]);

  const executeTryAgain = useCallback(
    async (userMessageId: string) => {
      if (!latestChat) return;

      const { agentType, resourceType } = dataRef.current;
      const previousMessages = [...messages];
      const messageIndex = messages.findIndex((m) => m.id === userMessageId);
      if (messageIndex === -1) return;

      setMessages(messages.slice(0, messageIndex + 1));

      await revertMessage(
        { chatId: latestChat._id, messageId: userMessageId, type: 'try-again' },
        {
          onSuccess: async () => {
            onRefetchResource?.();
            resume();
            track(TelemetryEvent.COPILOT_TRY_AGAIN, {
              chatId: latestChat._id,
              agentType,
              resourceType,
              userMessageId,
            });
          },
          onError: async (error) => {
            showErrorToast(`Failed to try again: ${error.message}`);
            Sentry.captureException(error, {
              tags: { feature: 'ai-copilot', action: 'try-again', agentType, resourceType },
              extra: { chatId: latestChat._id, messageId: userMessageId },
            });
            setMessages(previousMessages);
          },
        }
      );
    },
    [latestChat, messages, setMessages, revertMessage, resume, onRefetchResource, track, dataRef]
  );

  const executeRevertMessage = useCallback(
    async (messageId: string) => {
      if (!latestChat) return;

      const { agentType, resourceType } = dataRef.current;
      const previousMessages = [...messages];
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const userMessage = messages[messageIndex];
      const userMessageText = userMessage.parts?.find((p) => p.type === 'text')?.text ?? '';

      setInputText(userMessageText);

      const optimisticMessages = messages.slice(0, messageIndex);
      setMessages(optimisticMessages);

      await revertMessage(
        { chatId: latestChat._id, messageId, type: 'revert' },
        {
          onSuccess: async () => {
            await refetchLatestChat();
            onRefetchResource?.();
            track(TelemetryEvent.COPILOT_CHANGES_REVERTED, {
              chatId: latestChat._id,
              agentType,
              resourceType,
              userMessageId: messageId,
            });
          },
          onError: async (error) => {
            showErrorToast(`Failed to revert message: ${error.message}`);
            Sentry.captureException(error, {
              tags: { feature: 'ai-copilot', action: 'revert-message', agentType, resourceType },
              extra: { chatId: latestChat._id, messageId },
            });
            setMessages(previousMessages);
          },
        }
      );
    },
    [latestChat, messages, setMessages, revertMessage, onRefetchResource, refetchLatestChat, track, dataRef]
  );

  const handleTryAgain = useCallback(async (userMessageId: string) => {
    setPendingRevertAction({ type: 'tryAgain', messageId: userMessageId });
  }, []);

  const handleRevertMessage = useCallback(
    async (messageId: string) => {
      if (isFirstUserMessage && firstMessageRevert) {
        setFirstMessageRevertDialogOpen(true);
        return;
      }

      setPendingRevertAction({ type: 'revert', messageId });
    },
    [isFirstUserMessage, firstMessageRevert]
  );

  const handleDiscard = useCallback(
    async (messageId: string) => {
      if (!latestChat) return;

      const { agentType, resourceType } = dataRef.current;
      const previousMessages = [...messages];
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const userMessage = messages[messageIndex];
      const userMessageText = userMessage.parts?.find((p) => p.type === 'text')?.text ?? '';

      setInputText(userMessageText);
      setMessages(messages.slice(0, messageIndex));

      await revertMessage(
        { chatId: latestChat._id, messageId, type: 'revert' },
        {
          onSuccess: async () => {
            await refetchLatestChat();
            onRefetchResource?.();
            track(TelemetryEvent.COPILOT_CHANGES_DISCARDED, {
              chatId: latestChat._id,
              agentType,
              resourceType,
              userMessageId: messageId,
            });
          },
          onError: async (error) => {
            showErrorToast(`Failed to discard changes: ${error.message}`);
            Sentry.captureException(error, {
              tags: { feature: 'ai-copilot', action: 'discard-changes', agentType, resourceType },
              extra: { chatId: latestChat._id, messageId },
            });
            setMessages(previousMessages);
            setInputText('');
          },
        }
      );
    },
    [latestChat, messages, setMessages, revertMessage, onRefetchResource, refetchLatestChat, track, dataRef]
  );

  const handleRevertConfirmationConfirm = useCallback(async () => {
    if (!pendingRevertAction) return;

    const { type, messageId } = pendingRevertAction;

    if (type === 'tryAgain') {
      await executeTryAgain(messageId);
    } else {
      await executeRevertMessage(messageId);
    }

    setPendingRevertAction(null);
  }, [pendingRevertAction, executeTryAgain, executeRevertMessage]);

  const handleFirstMessageRevertConfirm = useCallback(async () => {
    await firstMessageRevert?.onConfirm();
    setFirstMessageRevertDialogOpen(false);
  }, [firstMessageRevert]);

  const handleStop = useCallback(async () => {
    isStoppingRef.current = true;
    const { agentType, resourceType } = dataRef.current;
    await stop();
    if (latestChat && currentEnvironment && isGenerating) {
      await cancelStream({ environment: currentEnvironment, chatId: latestChat._id });
    }

    track(TelemetryEvent.COPILOT_GENERATION_STOPPED, {
      chatId: latestChat?._id,
      agentType,
      resourceType,
    });

    await refetchLatestChat();
    isStoppingRef.current = false;
  }, [latestChat, currentEnvironment, isGenerating, stop, refetchLatestChat, track, dataRef]);

  const isLoading = isResourceLoading || isFetchingAiChat || areEnvironmentsInitialLoading;

  const value: AiChatContextValue = useMemo(
    () => ({
      hasNoChatHistory,
      lastUserMessageId,
      messages,
      dataParts: dataParts as ReasoningDataPart[],
      status: status as ChatStatus,
      error,
      handleStop,
      isGenerating,
      isLoading,
      isCreatingChat: isCreatingAiChat,
      isActionPending,
      isReviewingChanges,
      inputText,
      newChatSuggestions,
      setInputText,
      handleSendMessage,
      handleKeepAll,
      handleTryAgain,
      handleRevertMessage,
      handleDiscard,
      handleSuggestionClick: handleSendMessage,
    }),
    [
      hasNoChatHistory,
      lastUserMessageId,
      messages,
      dataParts,
      status,
      error,
      handleStop,
      isGenerating,
      isLoading,
      isCreatingAiChat,
      isActionPending,
      isReviewingChanges,
      inputText,
      newChatSuggestions,
      handleSendMessage,
      handleKeepAll,
      handleTryAgain,
      handleRevertMessage,
      handleDiscard,
    ]
  );

  const revertConfirmationTitle =
    pendingRevertAction?.type === 'tryAgain'
      ? 'Are you sure you want to try again?'
      : 'Are you sure you want to revert the message?';
  const revertConfirmationDescription =
    pendingRevertAction?.type === 'tryAgain'
      ? 'This will undo the Novu Copilot response and discard all workflow changes made after it. The new response will be generated.'
      : 'This will undo the Novu Copilot response and discard all workflow changes made after it.';

  return (
    <AiChatContext.Provider value={value}>
      {children}
      {firstMessageRevert?.renderDialog({
        open: isFirstMessageRevertDialogOpen,
        onOpenChange: setFirstMessageRevertDialogOpen,
        onConfirm: handleFirstMessageRevertConfirm,
      })}
      <ConfirmationModal
        open={pendingRevertAction !== null}
        onOpenChange={(open) => !open && setPendingRevertAction(null)}
        onConfirm={handleRevertConfirmationConfirm}
        title={revertConfirmationTitle}
        description={revertConfirmationDescription}
        confirmButtonText={pendingRevertAction?.type === 'tryAgain' ? 'Try again' : 'Revert'}
        confirmButtonVariant="primary"
        isLoading={isActionPending}
      />
    </AiChatContext.Provider>
  );
}

// biome-ignore lint/style/useComponentExportOnlyModules: Hook is co-located with provider
export function useAiChat(): AiChatContextValue {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error('useAiChat must be used within AiChatProvider');
  }

  return context;
}
