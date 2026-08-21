import type {
  AgentChatPagination,
  AgentChatPlanLimitError,
  AgentConversationStatus,
  AgentConversationTyping,
  AgentEventEnvelope,
  AgentHashFields,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalDecision,
  LoadConversationResult,
  NovuError,
  RespondToActionResult,
  SendActionResult,
  SendMessageResult,
} from '@novu/js';
import { derivePendingActions } from '@novu/js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

export type UseAgentChatProps = AgentHashFields & {
  agentId: string;
  /**
   * Resume this conversation. The hook loads history on mount.
   * Omit this prop to start a new chat. The first send creates a conversation.
   * Later sends pass the returned id. Remount or clear this prop to start another chat.
   */
  conversationId?: string;
  onSuccess?: (data: LoadConversationResult) => void;
  onError?: (error: NovuError | AgentChatPlanLimitError) => void;
  /**
   * Fires once per message, when the message id first appears on the conversation.
   * History pages are silent: only new activity fires.
   * An agent message can still be empty at this point, because the first envelope of a
   * turn creates the message before any text is folded into it.
   * A send that never reaches the server does not fire: the message flips to `failed` instead.
   */
  onMessage?: (message: AgentMessage) => void;
  /**
   * Fires once per pending action, including actions still pending on mount, so a
   * resumed conversation reports what it is blocked on. Paging backwards is silent.
   */
  onActionRequested?: (action: AgentPendingAction) => void;
  /**
   * Raw envelopes for this conversation, before the derived callbacks for the same fold.
   * A duplicate envelope that the store drops does not fire. Neither does an envelope that
   * arrives before a newly created conversation claims its id.
   * The store folds the envelope before this callback runs, so `messages` here is one render old.
   */
  onEvent?: (envelope: AgentEventEnvelope) => void;
};

export type UseAgentChatResult = {
  messages: AgentMessage[];
  pendingActions: AgentPendingAction[];
  conversationId?: string;
  error?: NovuError | AgentChatPlanLimitError;
  /** True until the first history fetch completes. False when there is no `conversationId` prop. */
  isLoading: boolean;
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  pagination: AgentChatPagination & {
    fetchMore: () => Promise<{
      data?: { messages: AgentMessage[]; hasMore: boolean };
      error?: NovuError;
    }>;
  };
  refetch: () => Promise<void>;
  sendMessage: (text: string) => Promise<{
    data?: SendMessageResult;
    error?: NovuError | AgentChatPlanLimitError;
  }>;
  respondToAction: (args: { actionId: string; decision: AgentToolApprovalDecision }) => Promise<{
    data?: RespondToActionResult;
    error?: NovuError | AgentChatPlanLimitError;
  }>;
  sendAction: (args: { actionId: string; sourceMessageId: string; value?: string }) => Promise<{
    data?: SendActionResult;
    error?: NovuError | AgentChatPlanLimitError;
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

type ConversationSnapshot = {
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  pagination: AgentChatPagination;
  error?: NovuError | AgentChatPlanLimitError;
};

const EMPTY_CONVERSATION: ConversationSnapshot = {
  messages: [],
  isRunning: false,
  typing: undefined,
  status: 'active',
  pagination: { status: 'idle', hasMore: false },
};

function applyConversationSnapshot(
  snapshot: ConversationSnapshot,
  setters: {
    setMessages: (messages: AgentMessage[]) => void;
    setIsRunning: (isRunning: boolean) => void;
    setTyping: (typing?: AgentConversationTyping) => void;
    setStatus: (status: AgentConversationStatus) => void;
    setPagination: (pagination: AgentChatPagination) => void;
    setError: (error?: NovuError | AgentChatPlanLimitError) => void;
  }
): void {
  setters.setMessages(snapshot.messages);
  setters.setIsRunning(snapshot.isRunning);
  setters.setTyping(snapshot.typing);
  setters.setStatus(snapshot.status);
  setters.setPagination(snapshot.pagination);
  setters.setError(snapshot.error);
}

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const { agentId, agentHash, conversationId: conversationIdProp } = props;
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
  const [typing, setTyping] = useState<AgentConversationTyping>();
  const [status, setStatus] = useState<AgentConversationStatus>('active');
  const [pagination, setPagination] = useState<AgentChatPagination>({ status: 'idle', hasMore: false });
  const [error, setError] = useState<NovuError | AgentChatPlanLimitError>();
  const [isLoading, setIsLoading] = useState(Boolean(conversationIdProp));
  const fetchGenerationRef = useRef(0);

  const pendingActions = useMemo(() => derivePendingActions(messages), [messages]);

  const snapshotSetters = useMemo(
    () => ({
      setMessages,
      setIsRunning,
      setTyping,
      setStatus,
      setPagination,
      setError,
    }),
    []
  );

  useEffect(() => {
    const agentChanged = prevAgentIdRef.current !== agentId;
    const prevConversationIdProp = prevConversationIdPropRef.current;
    prevAgentIdRef.current = agentId;
    prevConversationIdPropRef.current = conversationIdProp;

    if (agentChanged) {
      setAssignedConversationId(undefined);
      setLocalSessionKey(createLocalSessionKey());
      applyConversationSnapshot(EMPTY_CONVERSATION, snapshotSetters);
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
      applyConversationSnapshot(EMPTY_CONVERSATION, snapshotSetters);
    }
  }, [agentId, conversationIdProp, snapshotSetters]);

  const fetchConversation = useCallback(
    async (targetConversationId: string) => {
      const generation = ++fetchGenerationRef.current;
      setError(undefined);
      setIsLoading(true);

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
        const snapshot = novu.agentChat.getConversation({
          agentId,
          conversationId: targetConversationId,
        });
        if (snapshot) {
          setPagination(snapshot.pagination);
        } else {
          setPagination({ status: 'idle', hasMore: response.data.hasMore });
        }
        propsRef.current.onSuccess?.(response.data);
      }

      setIsLoading(false);
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
      applyConversationSnapshot(
        {
          messages: snapshot.messages,
          isRunning: snapshot.isRunning,
          typing: snapshot.typing,
          status: snapshot.status,
          pagination: snapshot.pagination,
          error: snapshot.error,
        },
        snapshotSetters
      );
      if (snapshot.conversationId && !conversationIdProp) {
        setAssignedConversationId(snapshot.conversationId);
      }

      // The store reports each action once per holder, and a holder outlives a mount.
      // Replay from the snapshot so a remount still learns what the run is blocked on.
      for (const action of derivePendingActions(snapshot.messages)) {
        propsRef.current.onActionRequested?.(action);
      }
    } else if (!conversationIdProp) {
      applyConversationSnapshot(EMPTY_CONVERSATION, snapshotSetters);
    }

    const cleanup = novu.on('agent_chat.messages.updated', ({ data }) => {
      if (data.key !== sessionKeyRef.current) {
        return;
      }

      applyConversationSnapshot(
        {
          messages: data.messages,
          isRunning: data.isRunning,
          typing: data.typing,
          status: data.status,
          pagination: data.pagination,
          error: data.error,
        },
        snapshotSetters
      );
      if (data.conversationId && !propsRef.current.conversationId) {
        setAssignedConversationId(data.conversationId);
      }

      const { change } = data;
      if (change.kind === 'live') {
        propsRef.current.onEvent?.(change.envelope);
      }

      if (change.kind !== 'history') {
        for (const message of change.addedMessages) {
          propsRef.current.onMessage?.(message);
        }
      }

      for (const action of change.newActions) {
        propsRef.current.onActionRequested?.(action);
      }
    });

    if (conversationIdProp) {
      void fetchConversation(conversationIdProp);
    }

    return () => {
      cleanup();
      novu.agentChat.unsubscribe();
    };
  }, [novu, agentId, conversationIdProp, sessionKey, sessionKeyRef, propsRef, fetchConversation, snapshotSetters]);

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
      setPagination((current: AgentChatPagination) => ({
        ...current,
        hasMore: response.data!.hasMore,
      }));
    }

    return response;
  }, [novu, agentId, sessionKeyRef, conversationIdRef, propsRef]);

  const paginationWithFetch = useMemo(
    () => ({
      ...pagination,
      fetchMore,
    }),
    [pagination, fetchMore]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      setError(undefined);

      const response = await novu.agentChat.sendMessage({
        agentId,
        agentHash,
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
    [novu, agentId, agentHash, sessionKeyRef, conversationIdRef, propsRef]
  );

  const respondToAction = useCallback(
    async (args: { actionId: string; decision: AgentToolApprovalDecision }) => {
      setError(undefined);

      const response = await novu.agentChat.respondToAction({
        agentId,
        agentHash,
        key: sessionKeyRef.current,
        conversationId: conversationIdRef.current,
        actionId: args.actionId,
        decision: args.decision,
      });

      if (response.error) {
        setError(response.error);
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [novu, agentId, agentHash, sessionKeyRef, conversationIdRef, propsRef]
  );

  const sendAction = useCallback(
    async (args: { actionId: string; sourceMessageId: string; value?: string }) => {
      setError(undefined);

      const response = await novu.agentChat.sendAction({
        agentId,
        agentHash,
        key: sessionKeyRef.current,
        conversationId: conversationIdRef.current,
        actionId: args.actionId,
        sourceMessageId: args.sourceMessageId,
        value: args.value,
      });

      if (response.error) {
        setError(response.error);
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [novu, agentId, agentHash, sessionKeyRef, conversationIdRef, propsRef]
  );

  return {
    messages,
    pendingActions,
    sendMessage,
    respondToAction,
    sendAction,
    conversationId,
    error,
    isLoading,
    isRunning,
    typing,
    status,
    pagination: paginationWithFetch,
    refetch,
  };
};
