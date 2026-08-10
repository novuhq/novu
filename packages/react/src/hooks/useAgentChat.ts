import type {
  AgentApprovalPart,
  AgentConversationStatus,
  AgentMessage,
  LoadConversationResult,
  NovuError,
  RespondToApprovalResult,
  SendMessageResult,
} from '@novu/js';
import { derivePendingApprovals } from '@novu/js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

export type UseAgentChatProps = {
  agentId: string;
  /**
   * Resume this conversation. The hook loads history on mount.
   * Omit this prop to start a new chat. The first send creates a conversation.
   * Later sends pass the returned id. Remount or clear this prop to start another chat.
   */
  conversationId?: string;
  onSuccess?: (data: LoadConversationResult) => void;
  onError?: (error: NovuError) => void;
};

export type UseAgentChatResult = {
  messages: AgentMessage[];
  pendingApprovals: AgentApprovalPart[];
  conversationId?: string;
  error?: NovuError;
  /** True until the first history fetch completes. False when there is no `conversationId` prop. */
  isLoading: boolean;
  isFetching: boolean;
  isRunning: boolean;
  status: AgentConversationStatus;
  /** True when older history pages are available via `fetchMore`. */
  hasMore: boolean;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<{
    data?: { messages: AgentMessage[]; hasMore: boolean };
    error?: NovuError;
  }>;
  sendMessage: (text: string) => Promise<{
    data?: SendMessageResult;
    error?: NovuError;
  }>;
  respondToApproval: (args: { approvalId: string; decision: 'approved' | 'denied' }) => Promise<{
    data?: RespondToApprovalResult;
    error?: NovuError;
  }>;
};

function createLocalSessionKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    return `local_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return `local_${Date.now().toString(36)}`;
}

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const { agentId, conversationId: conversationIdProp } = props;
  const propsRef = useDataRef(props);
  const novu = useNovu();

  // Resume: the prop is the key on the same render (no effect lag).
  // Create: keep a `local_*` key until remount, prop clear, or agent change.
  const [localSessionKey, setLocalSessionKey] = useState(createLocalSessionKey);
  const sessionKey = conversationIdProp ?? localSessionKey;
  const sessionKeyRef = useDataRef(sessionKey);
  const prevAgentIdRef = useRef(agentId);
  const prevConversationIdPropRef = useRef(conversationIdProp);

  const [assignedConversationId, setAssignedConversationId] = useState<string>();
  const conversationId = conversationIdProp ?? assignedConversationId;
  const conversationIdRef = useDataRef(conversationId);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<AgentConversationStatus>('active');
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(Boolean(conversationIdProp));
  const [isFetching, setIsFetching] = useState(false);
  const fetchGenerationRef = useRef(0);

  const pendingApprovals = useMemo(() => derivePendingApprovals(messages), [messages]);

  useEffect(() => {
    const agentChanged = prevAgentIdRef.current !== agentId;
    const prevConversationIdProp = prevConversationIdPropRef.current;
    prevAgentIdRef.current = agentId;
    prevConversationIdPropRef.current = conversationIdProp;

    if (agentChanged) {
      setAssignedConversationId(undefined);
      setLocalSessionKey(createLocalSessionKey());
      setMessages([]);
      setIsRunning(false);
      setStatus('active');
      setHasMore(false);
      setError(undefined);
      setIsLoading(Boolean(conversationIdProp));

      return;
    }

    if (conversationIdProp) {
      setAssignedConversationId(undefined);

      return;
    }

    setIsLoading(false);
    if (prevConversationIdProp !== undefined) {
      setAssignedConversationId(undefined);
      setLocalSessionKey(createLocalSessionKey());
      setMessages([]);
      setIsRunning(false);
      setStatus('active');
      setHasMore(false);
    }
  }, [agentId, conversationIdProp]);

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
        setMessages(response.data.messages);
        setHasMore(response.data.hasMore);
        propsRef.current.onSuccess?.(response.data);
      }

      setIsLoading(false);
      setIsFetching(false);
    },
    [novu, agentId, propsRef]
  );

  useEffect(() => {
    novu.agentChat.subscribe();

    const snapshot = novu.agentChat.getConversation({
      agentId,
      key: sessionKey,
      conversationId: conversationIdProp,
    });
    if (snapshot) {
      setMessages(snapshot.messages);
      setIsRunning(snapshot.isRunning);
      setStatus(snapshot.status);
      setHasMore(snapshot.hasMore);
      if (snapshot.conversationId && !conversationIdProp) {
        setAssignedConversationId(snapshot.conversationId);
      }
    } else if (!conversationIdProp) {
      setMessages([]);
      setIsRunning(false);
      setStatus('active');
      setHasMore(false);
    }

    const cleanup = novu.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key !== sessionKeyRef.current) {
        return;
      }

      setMessages(data.messages);
      setIsRunning(data.isRunning);
      setStatus(data.status);
      setHasMore(data.hasMore);
      if (data.conversationId && !propsRef.current.conversationId) {
        setAssignedConversationId(data.conversationId);
      }
    });

    if (conversationIdProp) {
      void fetchConversation(conversationIdProp);
    }

    return () => {
      cleanup();
      novu.agentChat.unsubscribe();
    };
  }, [novu, agentId, conversationIdProp, sessionKey, sessionKeyRef, conversationIdRef, propsRef, fetchConversation]);

  const refetch = useCallback(async () => {
    const id = conversationIdRef.current;
    if (!id) {
      return;
    }

    await fetchConversation(id);
  }, [conversationIdRef, fetchConversation]);

  const fetchMore = useCallback(async () => {
    const response = await novu.agentChat.fetchMore({
      agentId,
      key: sessionKeyRef.current,
      conversationId: conversationIdRef.current,
    });

    if (response.error) {
      setError(response.error);
      propsRef.current.onError?.(response.error);
    } else if (response.data) {
      setMessages(response.data.messages);
      setHasMore(response.data.hasMore);
    }

    return response;
  }, [novu, agentId, sessionKeyRef, conversationIdRef, propsRef]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(undefined);

      const response = await novu.agentChat.sendMessage({
        agentId,
        text,
        key: sessionKeyRef.current,
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
    [novu, agentId, sessionKeyRef, conversationIdRef, propsRef]
  );

  const respondToApproval = useCallback(
    async (args: { approvalId: string; decision: 'approved' | 'denied' }) => {
      setError(undefined);

      const response = await novu.agentChat.respondToApproval({
        agentId,
        key: sessionKeyRef.current,
        conversationId: conversationIdRef.current,
        approvalId: args.approvalId,
        decision: args.decision,
      });

      if (response.error) {
        setError(response.error);
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [novu, agentId, sessionKeyRef, conversationIdRef, propsRef]
  );

  return {
    messages,
    pendingApprovals,
    sendMessage,
    respondToApproval,
    conversationId,
    error,
    isLoading,
    isFetching,
    isRunning,
    status,
    hasMore,
    refetch,
    fetchMore,
  };
};
