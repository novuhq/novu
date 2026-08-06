import type { NovuError, SendMessageResult } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseAgentChatProps = {
  /** Which agent to talk to. Required for uncontrolled (new) conversations. */
  agentId: string;
  /** Resume an existing conversation. Omit to start a new one on first send. */
  conversationId?: string;
  onError?: (error: NovuError) => void;
};

export type UseAgentChatResult = {
  conversationId?: string;
  error?: NovuError;
  sendMessage: (text: string) => Promise<{
    data?: SendMessageResult;
    error?: NovuError;
  }>;
};

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const { agentId, conversationId: conversationIdProp } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const novu = useNovu();
  const [conversationId, setConversationId] = useState<string | undefined>(conversationIdProp);
  const [error, setError] = useState<NovuError>();

  useEffect(() => {
    setConversationId(conversationIdProp);
  }, [conversationIdProp]);

  const sendMessage = useCallback(
    async (text: string) => {
      const { onError } = propsRef.current;
      setError(undefined);

      const response = await novu.agentChat.sendMessage({
        agentId,
        text,
        conversationId,
      });

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else if (response.data) {
        setConversationId(response.data.conversationId);
      }

      return response;
    },
    [novu, agentId, conversationId]
  );

  return {
    sendMessage,
    conversationId,
    error,
  };
};
