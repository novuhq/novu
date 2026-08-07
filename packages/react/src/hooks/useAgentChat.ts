import type { AgentMessage, LoadConversationResult, NovuError, SendMessageResult } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

export type UseAgentChatProps = {
  /** The agent that receives the messages. */
  agentId: string;
  /**
   * Resume this conversation (loads history on mount).
   * Omit for the agent draft: first send starts a chat; later sends sticky-resume it.
   * Loading another conversation elsewhere does not steal that draft.
   */
  conversationId?: string;
  onSuccess?: (data: LoadConversationResult) => void;
  onError?: (error: NovuError) => void;
};

export type UseAgentChatResult = {
  messages: AgentMessage[];
  conversationId?: string;
  error?: NovuError;
  /** True until the first history fetch completes. Always false when no `conversationId` prop is given. */
  isLoading: boolean;
  /** True while a history fetch is in progress. */
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

  const [assignedConversationId, setAssignedConversationId] = useState<string>();
  const conversationId = conversationIdProp ?? assignedConversationId;
  const conversationIdRef = useDataRef(conversationId);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(Boolean(conversationIdProp));
  const [isFetching, setIsFetching] = useState(false);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    if (conversationIdProp) {
      setAssignedConversationId(undefined);
    } else {
      setIsLoading(false);
    }
  }, [conversationIdProp]);

  const fetchConversation = useCallback(
    async (targetConversationId: string) => {
      const generation = ++fetchGenerationRef.current;
      setError(undefined);
      setIsLoading(true);
      setIsFetching(true);

      const response = await novu.agentChat.loadConversation({
        agentId,
        conversationId: targetConversationId,
      });

      if (generation !== fetchGenerationRef.current) {
        return;
      }

      if (response.error) {
        setError(response.error);
        propsRef.current.onError?.(response.error);
      } else if (response.data) {
        propsRef.current.onSuccess?.(response.data);
      }

      setIsLoading(false);
      setIsFetching(false);
    },
    [novu, agentId, propsRef]
  );

  useEffect(() => {
    const snapshot = novu.agentChat.getConversation({ agentId, conversationId: conversationIdProp });
    if (snapshot) {
      setMessages(snapshot.messages);
      if (snapshot.conversationId && !conversationIdProp) {
        setAssignedConversationId(snapshot.conversationId);
      }
    } else {
      setMessages([]);
    }

    const cleanup = novu.on('agent_chat.messages.updated', ({ data }) => {
      if (data.agentId !== agentId) {
        return;
      }

      // Exact identity: draft (no id) only accepts draft updates; a controlled /
      // assigned conversation only accepts that conversationId. Prevents same-agent
      // hooks from painting each other's timelines.
      const currentConversationId = conversationIdRef.current;
      if ((data.conversationId ?? undefined) !== (currentConversationId ?? undefined)) {
        return;
      }

      setMessages(data.messages);
      if (data.conversationId && !propsRef.current.conversationId) {
        setAssignedConversationId(data.conversationId);
      }
    });

    if (conversationIdProp) {
      void fetchConversation(conversationIdProp);
    }

    return cleanup;
  }, [novu, agentId, conversationIdProp, conversationIdRef, propsRef, fetchConversation]);

  const refetch = useCallback(async () => {
    const id = conversationIdRef.current;
    if (!id) {
      return;
    }

    await fetchConversation(id);
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
        setAssignedConversationId(response.data.conversationId);
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
