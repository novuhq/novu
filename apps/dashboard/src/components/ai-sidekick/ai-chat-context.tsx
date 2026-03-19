import { AiAgentTypeEnum, AiMessageRoleEnum, AiResourceTypeEnum } from '@novu/shared';
import { ChatStatus, DataUIPart, DynamicToolUIPart, generateId, UIMessage } from 'ai';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  setInputText: (text: string) => void;
  handleSendMessage: (message: string) => Promise<void>;
  handleKeepAll: () => Promise<void>;
  handleTryAgain: (messageId: string) => Promise<void>;
  handleRevertMessage: (messageId: string) => Promise<void>;
  handleDiscard: (messageId: string) => Promise<void>;
};

export type AiChatResourceConfig = {
  resourceType: AiResourceTypeEnum;
  resourceId?: string;
  agentType: AiAgentTypeEnum;
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
    agentType,
    isResourceLoading = false,
    onRefetchResource,
    onData,
    onKeepSuccess,
    onKeepError,
    firstMessageRevert,
  } = config;

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
  const location = useLocation();
  const { areEnvironmentsInitialLoading, currentEnvironment } = useEnvironment();

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

    return latestChat?._id ?? generateId();
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

        skipMessageSyncRef.current = true;
        refetchLatestChat();
      },
    });
  const dataRef = useDataRef({ isGenerating, resourceType, resourceId, isAborted, latestChat, messages });

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

      if (latestChat.activeStreamId) {
        resume();
      }
    }
  }, [latestChat, resume]);

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
      const { resourceType, resourceId, latestChat, messages } = dataRef.current;
      const isLastUserMessage = messages.length > 0 && messages[messages.length - 1].role === AiMessageRoleEnum.USER;

      const messageToSend = message.trim();
      if (!messageToSend) return;

      if (!latestChat) {
        const newChat = await createAiChat({ resourceType, resourceId });
        sendPrompt({ chatId: newChat._id, prompt: messageToSend });
      } else if (isLastUserMessage) {
        const lastUserMessage = messages.filter((m) => m.role === AiMessageRoleEnum.USER).pop();
        sendPrompt({ messageId: lastUserMessage?.id, chatId: latestChat._id, prompt: messageToSend });
      } else if (messageToSend) {
        sendPrompt({ chatId: latestChat._id, prompt: messageToSend });
      }
      setInputText('');
    },
    [dataRef, createAiChat, sendPrompt]
  );

  const handleKeepAll = useCallback(async () => {
    if (!lastUserMessageId || !latestChat) return;

    await keepChanges(
      { chatId: latestChat._id, messageId: lastUserMessageId },
      {
        onSuccess: () => {
          refetchLatestChat();
          onKeepSuccess?.();
        },
        onError: () => {
          onKeepError?.();
        },
      }
    );
  }, [latestChat, lastUserMessageId, keepChanges, refetchLatestChat, onKeepSuccess, onKeepError]);

  const executeTryAgain = useCallback(
    async (userMessageId: string) => {
      if (!latestChat) return;

      const previousMessages = [...messages];
      const messageIndex = messages.findIndex((m) => m.id === userMessageId);
      if (messageIndex === -1) return;

      setMessages(messages.slice(0, messageIndex + 1));

      await revertMessage(
        { chatId: latestChat._id, messageId: userMessageId, type: 'try-again' },
        {
          onSuccess: async () => {
            onRefetchResource?.();
            // we set the resume checkpoint id when we reverted the message,
            // so we need to resume the stream to continue from that checkpoint
            resume();
          },
          onError: async (error) => {
            showErrorToast(`Failed to try again: ${error.message}`);
            setMessages(previousMessages);
          },
        }
      );
    },
    [latestChat, messages, setMessages, revertMessage, resume, onRefetchResource]
  );

  const executeRevertMessage = useCallback(
    async (messageId: string) => {
      if (!latestChat) return;

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
          },
          onError: async (error) => {
            showErrorToast(`Failed to revert message: ${error.message}`);
            setMessages(previousMessages);
          },
        }
      );
    },
    [latestChat, messages, setMessages, revertMessage, onRefetchResource, refetchLatestChat]
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
          },
          onError: async (error) => {
            showErrorToast(`Failed to discard changes: ${error.message}`);
            setMessages(previousMessages);
            setInputText('');
          },
        }
      );
    },
    [latestChat, messages, setMessages, revertMessage, onRefetchResource, refetchLatestChat]
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
    await stop();
    if (latestChat && currentEnvironment && isGenerating) {
      await cancelStream({ environment: currentEnvironment, chatId: latestChat._id });
    }

    await refetchLatestChat();
    isStoppingRef.current = false;
  }, [latestChat, currentEnvironment, isGenerating, stop, refetchLatestChat]);

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
      setInputText,
      handleSendMessage,
      handleKeepAll,
      handleTryAgain,
      handleRevertMessage,
      handleDiscard,
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
      ? 'This will undo the AI response and resend your message. The AI will generate a new response.'
      : 'This will undo the AI response and remove the changes from this message.';

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
