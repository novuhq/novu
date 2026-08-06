import type { AgentMessage, NovuError, SendMessageResult } from '@novu/js';
import { useCallback, useEffect, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

export type UseAgentChatProps = {
  /** Which agent to talk to. Required for uncontrolled (new) conversations. */
  agentId: string;
  /** Resume an existing conversation. Omit to start a new one on first send. */
  conversationId?: string;
  onError?: (error: NovuError) => void;
};

export type UseAgentChatResult = {
  messages: AgentMessage[];
  conversationId?: string;
  error?: NovuError;
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

  useEffect(() => {
    if (conversationIdProp) {
      setAdoptedConversationId(undefined);
    }
  }, [conversationIdProp]);

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

    return cleanup;
  }, [novu, agentId, conversationIdProp, conversationIdRef, propsRef]);

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
  };
};
