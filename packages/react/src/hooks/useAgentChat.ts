import type {
  AgentChatPagination,
  AgentChatPlanLimitError,
  AgentConversationRunSnapshot,
  AgentConversationRuntime,
  AgentConversationSnapshot,
  AgentConversationStatus,
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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

type UseAgentChatCallbacks = {
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

export type UseAgentChatProps = UseAgentChatCallbacks &
  AgentHashFields &
  (
    | {
        agentId: string;
        /**
         * Resume this conversation. The hook loads history on mount.
         * Omit this prop to start a new chat. The first send creates a conversation.
         * Later sends pass the returned id. Remount or clear this prop to start another chat.
         */
        conversationId?: string;
        conversation?: never;
      }
    | {
        /** Share an existing conversation runtime across multiple hook instances. */
        conversation: AgentConversationRuntime;
        agentId?: never;
        conversationId?: never;
        agentHash?: never;
      }
  );

export type UseAgentChatResult = {
  messages: AgentMessage[];
  pendingActions: AgentPendingAction[];
  conversationId?: string;
  error?: NovuError | AgentChatPlanLimitError;
  /** True until the first history fetch completes. False when there is no `conversationId` prop. */
  isLoading: boolean;
  isRunning: boolean;
  typing?: AgentConversationRunSnapshot['typing'];
  /** Conversation lifecycle status (`active`, etc.). */
  status: AgentConversationStatus;
  /** Explicit alias for `status`. */
  conversationStatus: AgentConversationStatus;
  /** Current agent run snapshot. */
  run: AgentConversationRunSnapshot;
  pagination: AgentChatPagination & {
    fetchMore: () => Promise<{
      data?: { messages: AgentMessage[]; hasMore: boolean };
      error?: NovuError;
    }>;
  };
  /** True while reconnect catch-up is in flight for this conversation. */
  isRecovering: boolean;
  /** Set when reconnect catch-up fails. Separate from send/fetch `error`. */
  catchUpError?: NovuError;
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
  retryMessage: (messageId: string) => Promise<{
    data?: SendMessageResult;
    error?: NovuError | AgentChatPlanLimitError;
  }>;
};

function subscribeToRuntime(runtime: AgentConversationRuntime, onStoreChange: () => void): () => void {
  return runtime.subscribe(() => {
    onStoreChange();
  });
}

const EMPTY_SERVER_SNAPSHOT: AgentConversationSnapshot = {
  key: 'ssr',
  status: 'ready',
  run: { isRunning: false },
  conversationStatus: 'active',
  pagination: { hasMore: false, status: 'idle' },
  messages: [],
  pendingActions: [],
  isRecovering: false,
};

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const novu = useNovu();
  const propsRef = useDataRef(props);

  const sharedRuntime = 'conversation' in props ? props.conversation : undefined;
  const agentId = sharedRuntime?.agentId ?? props.agentId!;
  const conversationIdProp = sharedRuntime ? undefined : props.conversationId;
  const agentHash = sharedRuntime ? undefined : props.agentHash;

  const ownedRuntimeRef = useRef<AgentConversationRuntime | null>(null);
  const ownsRuntimeRef = useRef(false);
  const prevAgentIdRef = useRef(agentId);
  const prevConversationIdPropRef = useRef(conversationIdProp);
  const [createSessionGeneration, setCreateSessionGeneration] = useState(0);

  useEffect(() => {
    const agentChanged = prevAgentIdRef.current !== agentId;
    const prevConversationIdProp = prevConversationIdPropRef.current;
    prevAgentIdRef.current = agentId;
    prevConversationIdPropRef.current = conversationIdProp;

    if (sharedRuntime) {
      return;
    }

    if (agentChanged || (prevConversationIdProp !== undefined && conversationIdProp === undefined)) {
      if (ownsRuntimeRef.current && ownedRuntimeRef.current) {
        ownedRuntimeRef.current.dispose();
      }
      ownedRuntimeRef.current = null;
      ownsRuntimeRef.current = false;
      setCreateSessionGeneration((generation) => generation + 1);
    }

    if (conversationIdProp && ownsRuntimeRef.current && ownedRuntimeRef.current) {
      ownedRuntimeRef.current.dispose();
      ownedRuntimeRef.current = null;
      ownsRuntimeRef.current = false;
    }
  }, [agentId, conversationIdProp, sharedRuntime]);

  const runtime = useMemo(() => {
    if (sharedRuntime) {
      return sharedRuntime;
    }

    if (conversationIdProp) {
      const result = novu.agentChat.conversation({
        agentId,
        conversationId: conversationIdProp,
        agentHash,
      });

      return result.ok ? result.data : null;
    }

    if (!ownedRuntimeRef.current) {
      const result = novu.agentChat.conversation({ agentId, agentHash });
      if (result.ok) {
        ownedRuntimeRef.current = result.data;
        ownsRuntimeRef.current = true;
      }
    }

    return ownedRuntimeRef.current;
  }, [sharedRuntime, novu, agentId, conversationIdProp, agentHash, createSessionGeneration]);

  useEffect(() => {
    return () => {
      if (ownsRuntimeRef.current && ownedRuntimeRef.current) {
        ownedRuntimeRef.current.dispose();
        ownedRuntimeRef.current = null;
        ownsRuntimeRef.current = false;
      }
    };
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!runtime) {
        return () => {};
      }

      return subscribeToRuntime(runtime, onStoreChange);
    },
    [runtime]
  );

  const getSnapshot = useCallback(() => {
    return runtime?.getSnapshot() ?? EMPTY_SERVER_SNAPSHOT;
  }, [runtime]);

  const getServerSnapshot = useCallback(() => {
    return runtime?.getServerSnapshot() ?? EMPTY_SERVER_SNAPSHOT;
  }, [runtime]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const notifiedCatchUpErrorRef = useRef<NovuError | undefined>();
  const lastReportedErrorKeyRef = useRef<string>();
  const loadNotifiedRef = useRef(false);
  const replayedActionsRef = useRef(false);

  useEffect(() => {
    loadNotifiedRef.current = false;
    replayedActionsRef.current = false;
    notifiedCatchUpErrorRef.current = undefined;
    lastReportedErrorKeyRef.current = undefined;
  }, [runtime]);

  useEffect(() => {
    if (!runtime) {
      return;
    }

    if (!replayedActionsRef.current) {
      replayedActionsRef.current = true;
      for (const action of runtime.getSnapshot().pendingActions) {
        propsRef.current.onActionRequested?.(action);
      }
    }

    return novu.agentChat.onMessagesUpdated((data) => {
      if (data.key !== runtime.key) {
        return;
      }

      if (data.change.kind === 'history' && !loadNotifiedRef.current && conversationIdProp) {
        loadNotifiedRef.current = true;
        propsRef.current.onSuccess?.({
          conversationId: data.conversationId!,
          messages: data.messages,
          hasMore: data.hasMore,
        });
      }

      if (data.catchUpError && data.catchUpError !== notifiedCatchUpErrorRef.current) {
        notifiedCatchUpErrorRef.current = data.catchUpError;
        propsRef.current.onError?.(data.catchUpError);
      } else if (data.catchUpError === undefined) {
        notifiedCatchUpErrorRef.current = undefined;
      }

      if (data.error) {
        const errorKey = `${data.error.message}:${data.error.originalError?.message ?? ''}`;
        if (lastReportedErrorKeyRef.current !== errorKey) {
          lastReportedErrorKeyRef.current = errorKey;
          propsRef.current.onError?.(data.error);
        }
      } else {
        lastReportedErrorKeyRef.current = undefined;
      }

      if (data.change.kind === 'live') {
        propsRef.current.onEvent?.(data.change.envelope);
      }

      if (data.change.kind !== 'history') {
        for (const message of data.change.addedMessages) {
          propsRef.current.onMessage?.(message);
        }
      }

      for (const action of data.change.newActions) {
        propsRef.current.onActionRequested?.(action);
      }
    });
  }, [novu, runtime, conversationIdProp, propsRef]);

  const refetch = useCallback(async () => {
    if (!runtime) {
      return;
    }

    const response = await runtime.load();
    if (response.data) {
      propsRef.current.onSuccess?.({
        conversationId: response.data.conversationId,
        messages: [...response.data.messages],
        hasMore: response.data.hasMore,
      });
    }
  }, [runtime, propsRef]);

  const fetchMore = useCallback(async () => {
    if (!runtime) {
      return { error: undefined };
    }

    const response = await runtime.fetchMore();
    if (response.error) {
      propsRef.current.onError?.(response.error);
    }

    return {
      ...response,
      data: response.data
        ? {
            messages: [...response.data.messages],
            hasMore: response.data.hasMore,
          }
        : undefined,
    };
  }, [runtime, propsRef]);

  const paginationWithFetch = useMemo(
    () => ({
      status: snapshot.pagination.status,
      hasMore: snapshot.pagination.hasMore,
      fetchMore,
    }),
    [snapshot.pagination.status, snapshot.pagination.hasMore, fetchMore]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!runtime) {
        return { error: undefined };
      }

      const response = await runtime.sendMessage(text);
      if (response.error) {
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [runtime, propsRef]
  );

  const respondToAction = useCallback(
    async (args: { actionId: string; decision: AgentToolApprovalDecision }) => {
      if (!runtime) {
        return { error: undefined };
      }

      const response = await runtime.respondToAction(args);
      if (response.error) {
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [runtime, propsRef]
  );

  const sendAction = useCallback(
    async (args: { actionId: string; sourceMessageId: string; value?: string }) => {
      if (!runtime) {
        return { error: undefined };
      }

      const response = await runtime.sendAction(args);
      if (response.error) {
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [runtime, propsRef]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!runtime) {
        return { error: undefined };
      }

      const response = await runtime.retryMessage(messageId);
      if (response.error) {
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [runtime, propsRef]
  );

  return {
    messages: [...snapshot.messages],
    pendingActions: [...snapshot.pendingActions],
    conversationId: snapshot.conversationId,
    error: snapshot.error as UseAgentChatResult['error'],
    isLoading: snapshot.status === 'loading',
    isRunning: snapshot.run.isRunning,
    typing: snapshot.run.typing,
    status: snapshot.conversationStatus,
    conversationStatus: snapshot.conversationStatus,
    run: snapshot.run,
    pagination: paginationWithFetch,
    isRecovering: snapshot.isRecovering,
    catchUpError: snapshot.catchUpError,
    refetch,
    sendMessage,
    respondToAction,
    sendAction,
    retryMessage,
  };
};
