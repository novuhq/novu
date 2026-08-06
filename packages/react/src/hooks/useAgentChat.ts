import type { AgentMessage, LoadConversationResult, NovuError, SendMessageResult } from '@novu/js';
import { useCallback, useEffect, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

export type UseAgentChatProps = {
  /** Which agent to talk to. Required for uncontrolled (new) conversations. */
  agentId: string;
  /** Resume an existing conversation. Omit to start a new one on first send. */
  conversationId?: string;
  onSuccess?: (data: LoadConversationResult) => void;
  onError?: (error: NovuError) => void;
};

export type UseAgentChatResult = {
  messages: AgentMessage[];
  conversationId?: string;
  error?: NovuError;
  /** True until the first history fetch finishes (only when `conversationId` prop is set). */
  isLoading: boolean;
  /** True while any history fetch is in flight. */
  isFetching: boolean;
  refetch: () => Promise<void>;
  sendMessage: (text: string) => Promise<{
    data?: SendMessageResult;
    error?: NovuError;
  }>;
};

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const { agentId, conversationId: conversationIdProp } = props;
  const propsRef = useDataRef(props);
  const novu = useNovu();

  const [adoptedConversationId, setAdoptedConversationId] = useState<string>();
  const conversationId = conversationIdProp ?? adoptedConversationId;
  const conversationIdRef = useDataRef(conversationId);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(Boolean(conversationIdProp));
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (conversationIdProp) {
      setAdoptedConversationId(undefined);
    }
  }, [conversationIdProp]);

  const fetchConversation = useCallback(
    async (targetConversationId: string, options?: { refetch?: boolean }) => {
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }

      setIsFetching(true);

      try {
        const response = await novu.agentChat.loadConversation({
          agentId,
          conversationId: targetConversationId,
        });

        if (response.error) {
          setError(response.error);
          propsRef.current.onError?.(response.error);
        } else if (response.data) {
          propsRef.current.onSuccess?.(response.data);
        }
      } catch (err) {
        const novuError = err as NovuError;
        setError(novuError);
        propsRef.current.onError?.(novuError);
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [novu, agentId, propsRef]
  );

  useEffect(() => {
    const snapshot = novu.agentChat.getConversation({ agentId, conversationId: conversationIdProp });
    if (snapshot) {
      setMessages(snapshot.messages);
      if (snapshot.conversationId && !conversationIdProp) {
        setAdoptedConversationId(snapshot.conversationId);
      }
    } else {
      setMessages([]);
    }

    const cleanup = novu.on('agent_chat.messages.updated', ({ data }) => {
      if (data.agentId !== agentId) {
        return;
      }

      const currentConversationId = conversationIdRef.current;
      if (currentConversationId && data.conversationId && data.conversationId !== currentConversationId) {
        return;
      }

      setMessages(data.messages);
      if (data.conversationId && !propsRef.current.conversationId) {
        setAdoptedConversationId(data.conversationId);
      }
    });

    if (conversationIdProp) {
      void fetchConversation(conversationIdProp, { refetch: true });
    } else {
      setIsLoading(false);
    }

    return cleanup;
  }, [novu, agentId, conversationIdProp, conversationIdRef, propsRef, fetchConversation]);

  const refetch = useCallback(async () => {
    const id = conversationIdRef.current;
    if (!id) {
      return;
    }

    await fetchConversation(id, { refetch: true });
  }, [conversationIdRef, fetchConversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(undefined);

      const response = await novu.agentChat.sendMessage({
        agentId,
        text,
        conversationId: conversationIdRef.current,
      });

      if (response.error) {
        setError(response.error);
        propsRef.current.onError?.(response.error);
      } else if (response.data && !propsRef.current.conversationId) {
        setAdoptedConversationId(response.data.conversationId);
      }

      return response;
    },
    [novu, agentId, conversationIdRef, propsRef]
  );

  return {
    messages,
    sendMessage,
    conversationId,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
