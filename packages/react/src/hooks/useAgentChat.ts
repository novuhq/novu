import type {
  AgentApprovalPart,
  AgentConversationStatus,
  AgentConversationTyping,
  AgentEventEnvelope,
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
  /**
   * Fires once per message, when the message id first appears on the conversation.
   * History pages are silent: only new activity fires.
   * An agent message can still be empty at this point, because the first envelope of a
   * turn creates the message before any text is folded into it.
   * A send that never reaches the server does not fire: the message flips to `failed` instead.
   */
  onMessage?: (message: AgentMessage) => void;
  /**
   * Fires once per approval request, including approvals still pending on mount, so a
   * resumed conversation reports what it is blocked on. Paging backwards is silent.
   * The run waits until `respondToApproval` answers.
   */
  onApprovalRequested?: (approval: AgentApprovalPart) => void;
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
  pendingApprovals: AgentApprovalPart[];
  conversationId?: string;
  error?: NovuError;
  /** True until the first history fetch completes. False when there is no `conversationId` prop. */
  isLoading: boolean;
  isFetching: boolean;
  isRunning: boolean;
  typing?: AgentConversationTyping;
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

type ConversationSnapshot = {
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  hasMore: boolean;
};

const EMPTY_CONVERSATION: ConversationSnapshot = {
  messages: [],
  isRunning: false,
  typing: undefined,
  status: 'active',
  hasMore: false,
};

function applyConversationSnapshot(
  snapshot: ConversationSnapshot,
  setters: {
    setMessages: (messages: AgentMessage[]) => void;
    setIsRunning: (isRunning: boolean) => void;
    setTyping: (typing?: AgentConversationTyping) => void;
    setStatus: (status: AgentConversationStatus) => void;
    setHasMore: (hasMore: boolean) => void;
  }
): void {
  setters.setMessages(snapshot.messages);
  setters.setIsRunning(snapshot.isRunning);
  setters.setTyping(snapshot.typing);
  setters.setStatus(snapshot.status);
  setters.setHasMore(snapshot.hasMore);
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
  const [typing, setTyping] = useState<AgentConversationTyping>();
  const [status, setStatus] = useState<AgentConversationStatus>('active');
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(Boolean(conversationIdProp));
  const [isFetching, setIsFetching] = useState(false);
  const fetchGenerationRef = useRef(0);

  const pendingApprovals = useMemo(() => derivePendingApprovals(messages), [messages]);

  const snapshotSetters = useMemo(
    () => ({
      setMessages,
      setIsRunning,
      setTyping,
      setStatus,
      setHasMore,
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
      applyConversationSnapshot(
        {
          messages: snapshot.messages,
          isRunning: snapshot.isRunning,
          typing: snapshot.typing,
          status: snapshot.status,
          hasMore: snapshot.hasMore,
        },
        snapshotSetters
      );
      if (snapshot.conversationId && !conversationIdProp) {
        setAssignedConversationId(snapshot.conversationId);
      }

      // The store reports each approval once per holder, and a holder outlives a mount.
      // Replay from the snapshot so a remount still learns what the run is blocked on.
      for (const approval of derivePendingApprovals(snapshot.messages)) {
        propsRef.current.onApprovalRequested?.(approval);
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
          hasMore: data.hasMore,
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

      for (const approval of change.newApprovals) {
        propsRef.current.onApprovalRequested?.(approval);
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
    typing,
    status,
    hasMore,
    refetch,
    fetchMore,
  };
};
