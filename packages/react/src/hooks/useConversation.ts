import type { ConversationMessage, NovuError } from '@novu/js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

function generateConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Headless chat state for one web conversation with an agent: history, live
 * agent replies (streamed over SSE while a send is in flight, recovered by
 * refetch otherwise), typing indicator, and the send/action dispatchers that
 * drive custom chat UIs — including buttons inside custom cards.
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, sendAction, isTyping } = useConversation({ agent: 'support-agent' });
 *
 * return (
 *   <div>
 *     {messages.map((message) => (
 *       <ChatMessage key={message.id} message={message} onAction={sendAction} />
 *     ))}
 *     {isTyping && <TypingDots />}
 *     <ChatInput onSubmit={sendMessage} />
 *   </div>
 * );
 * ```
 */
export type UseConversationProps = {
  /** Agent identifier (as shown in the Novu dashboard). */
  agent: string;
  /**
   * Resume an existing conversation. When omitted, a fresh conversation id is
   * generated for the lifetime of the hook (reset via `newConversation()`).
   */
  conversationId?: string;
  /** Only needed when the agent has multiple web integrations. */
  integrationIdentifier?: string;
  /** Refetch history when the window regains focus (default `true`). */
  refetchOnWindowFocus?: boolean;
  onError?: (error: NovuError) => void;
};

export type UseConversationResult = {
  /** The active conversation id (client-generated when not provided). */
  conversationId: string;
  messages: ConversationMessage[];
  error?: NovuError;
  /** Initial history load for the active conversation. */
  isLoading: boolean;
  /** An agent turn (send or action) is currently streaming. */
  isStreaming: boolean;
  isTyping: boolean;
  typingStatus?: string;
  sendMessage: (text: string) => Promise<{ data?: ConversationMessage; error?: NovuError }>;
  sendAction: (
    actionId: string,
    value?: string,
    sourceMessageId?: string
  ) => Promise<{ data?: void; error?: NovuError }>;
  refetch: () => Promise<void>;
  /** Start a fresh conversation (no-op when `conversationId` is controlled). */
  newConversation: () => void;
};

export const useConversation = (props: UseConversationProps): UseConversationResult => {
  const {
    agent,
    conversationId: controlledConversationId,
    integrationIdentifier,
    refetchOnWindowFocus = true,
    onError,
  } = props;
  const novu = useNovu();
  const [generatedId, setGeneratedId] = useState(generateConversationId);
  const conversationId = controlledConversationId ?? generatedId;

  const target = useMemo(() => ({ agent, conversationId }), [agent, conversationId]);
  const [messages, setMessages] = useState<ConversationMessage[]>(() => novu.conversations.getMessagesSnapshot(target));
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(() => novu.conversations.isStreaming(target));
  const [typing, setTyping] = useState<{ isTyping: boolean; status?: string }>(() =>
    novu.conversations.getTypingSnapshot(target)
  );
  const onErrorRef = useDataRef(onError);

  useEffect(() => {
    setMessages(novu.conversations.getMessagesSnapshot(target));
    setTyping(novu.conversations.getTypingSnapshot(target));
    setIsStreaming(novu.conversations.isStreaming(target));

    const cleanups = [
      novu.on('conversation.messages.updated', (event) => {
        if (event.agent !== target.agent || event.conversationId !== target.conversationId) return;
        setMessages(event.messages);
      }),
      novu.on('conversation.typing.updated', (event) => {
        if (event.agent !== target.agent || event.conversationId !== target.conversationId) return;
        setTyping({ isTyping: event.isTyping, status: event.status });
      }),
      novu.on('conversation.turn.updated', (event) => {
        if (event.agent !== target.agent || event.conversationId !== target.conversationId) return;
        setIsStreaming(event.status === 'streaming');
      }),
    ];

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [novu, target]);

  const fetchHistory = useCallback(
    async (options?: { initial?: boolean }) => {
      if (options?.initial) {
        setIsLoading(true);
        setError(undefined);
      }

      const response = await novu.conversations.fetchMessages({ ...target, integrationIdentifier });

      if (response.error) {
        setError(response.error);
        onErrorRef.current?.(response.error);
      }

      if (options?.initial) {
        setIsLoading(false);
      }
    },
    [novu, target, integrationIdentifier, onErrorRef]
  );

  useEffect(() => {
    fetchHistory({ initial: true });
  }, [fetchHistory]);

  useEffect(() => {
    if (!refetchOnWindowFocus || typeof window === 'undefined') {
      return undefined;
    }

    // SSE-only transport: replies landing while no request is in flight are
    // persistence-only, so regaining focus is a refetch opportunity.
    const onFocus = () => {
      if (!novu.conversations.isStreaming(target)) {
        fetchHistory();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onFocus();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refetchOnWindowFocus, novu, target, fetchHistory]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(undefined);

      const response = await novu.conversations.send({ ...target, integrationIdentifier, text });
      if (response.error) {
        setError(response.error);
        onErrorRef.current?.(response.error);
      }

      return response;
    },
    [novu, target, integrationIdentifier, onErrorRef]
  );

  const sendAction = useCallback(
    async (actionId: string, value?: string, sourceMessageId?: string) => {
      setError(undefined);

      const response = await novu.conversations.sendAction({
        ...target,
        integrationIdentifier,
        actionId,
        value,
        sourceMessageId,
      });
      if (response.error) {
        setError(response.error);
        onErrorRef.current?.(response.error);
      }

      return response;
    },
    [novu, target, integrationIdentifier, onErrorRef]
  );

  const refetch = useCallback(() => fetchHistory(), [fetchHistory]);

  const newConversation = useCallback(() => {
    if (controlledConversationId) return;
    setGeneratedId(generateConversationId());
  }, [controlledConversationId]);

  return {
    conversationId,
    messages,
    error,
    isLoading,
    isStreaming,
    isTyping: typing.isTyping,
    typingStatus: typing.status,
    sendMessage,
    sendAction,
    refetch,
    newConversation,
  };
};
