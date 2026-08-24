import type {
  AgentChatPagination,
  AgentChatPlanLimitError,
  AgentConversationPublicationMeta,
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
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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

type RuntimeActionResult<T> = {
  data?: T;
  error?: NovuError | AgentChatPlanLimitError;
};

function handlePublicationCallbacks(args: {
  snapshot: AgentConversationSnapshot;
  meta: AgentConversationPublicationMeta | undefined;
  conversationIdProp: string | undefined;
  propsRef: ReturnType<typeof useDataRef<UseAgentChatProps>>;
  loadNotifiedRef: MutableRefObject<boolean>;
  notifiedCatchUpErrorRef: MutableRefObject<NovuError | undefined>;
  lastReportedErrorKeyRef: MutableRefObject<string | undefined>;
}): void {
  const {
    snapshot,
    meta,
    conversationIdProp,
    propsRef,
    loadNotifiedRef,
    notifiedCatchUpErrorRef,
    lastReportedErrorKeyRef,
  } = args;

  if ((meta?.historyLoaded || meta?.change?.kind === 'history') && !loadNotifiedRef.current && conversationIdProp) {
    if (snapshot.conversationId) {
      loadNotifiedRef.current = true;
      propsRef.current.onSuccess?.({
        conversationId: snapshot.conversationId,
        messages: [...snapshot.messages],
        hasMore: snapshot.pagination.hasMore,
      });
    }
  }

  if (snapshot.catchUpError && snapshot.catchUpError !== notifiedCatchUpErrorRef.current) {
    notifiedCatchUpErrorRef.current = snapshot.catchUpError;
    propsRef.current.onError?.(snapshot.catchUpError);
  } else if (!snapshot.catchUpError) {
    notifiedCatchUpErrorRef.current = undefined;
  }

  if (snapshot.error) {
    const originalMessage = 'originalError' in snapshot.error ? (snapshot.error.originalError?.message ?? '') : '';
    const errorKey = `${snapshot.error.message}:${originalMessage}`;
    if (lastReportedErrorKeyRef.current !== errorKey) {
      lastReportedErrorKeyRef.current = errorKey;
      propsRef.current.onError?.(snapshot.error as NovuError | AgentChatPlanLimitError);
    }
  } else {
    lastReportedErrorKeyRef.current = undefined;
  }

  const change = meta?.change;
  if (change?.kind === 'live') {
    propsRef.current.onEvent?.(change.envelope);
  }

  if (change && change.kind !== 'history') {
    for (const message of change.addedMessages) {
      propsRef.current.onMessage?.(message);
    }
  }

  if (change) {
    for (const action of change.newActions) {
      propsRef.current.onActionRequested?.(action);
    }
  }
}

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const novu = useNovu();
  const propsRef = useDataRef(props);

  const sharedRuntime = 'conversation' in props ? props.conversation : undefined;
  const agentId = sharedRuntime?.agentId ?? props.agentId!;
  const conversationIdProp = sharedRuntime ? undefined : props.conversationId;
  const agentHash = sharedRuntime ? undefined : props.agentHash;

  const [ownedRuntime, setOwnedRuntime] = useState<AgentConversationRuntime | null>(null);

  const cachedRuntime = useMemo(() => {
    if (sharedRuntime) {
      return sharedRuntime;
    }

    if (!conversationIdProp) {
      return null;
    }

    const result = novu.agentChat.conversation({
      agentId,
      conversationId: conversationIdProp,
      agentHash,
    });

    return result.ok ? result.data : null;
  }, [sharedRuntime, novu, agentId, conversationIdProp, agentHash]);

  useEffect(() => {
    if (sharedRuntime || conversationIdProp) {
      setOwnedRuntime(null);
      return;
    }

    const result = novu.agentChat.conversation({ agentId, agentHash });
    if (!result.ok) {
      setOwnedRuntime(null);
      return;
    }

    const runtime = result.data;
    setOwnedRuntime(runtime);

    return () => {
      runtime.dispose();
      setOwnedRuntime(null);
    };
  }, [sharedRuntime, conversationIdProp, agentId, agentHash, novu]);

  const runtime = sharedRuntime ?? cachedRuntime ?? ownedRuntime;

  const loadNotifiedRef = useRef(false);
  const replayedActionsRef = useRef(false);
  const notifiedCatchUpErrorRef = useRef<NovuError | undefined>();
  const lastReportedErrorKeyRef = useRef<string>();

  useEffect(() => {
    loadNotifiedRef.current = false;
    replayedActionsRef.current = false;
    notifiedCatchUpErrorRef.current = undefined;
    lastReportedErrorKeyRef.current = undefined;
  }, [runtime]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!runtime) {
        return () => {};
      }

      if (!replayedActionsRef.current) {
        replayedActionsRef.current = true;
        for (const action of runtime.getSnapshot().pendingActions) {
          propsRef.current.onActionRequested?.(action);
        }
      }

      return runtime.subscribe((snapshot, meta) => {
        onStoreChange();
        handlePublicationCallbacks({
          snapshot,
          meta,
          conversationIdProp,
          propsRef,
          loadNotifiedRef,
          notifiedCatchUpErrorRef,
          lastReportedErrorKeyRef,
        });
      });
    },
    [runtime, conversationIdProp, propsRef]
  );

  const getSnapshot = useCallback(() => {
    return runtime?.getSnapshot() ?? EMPTY_SERVER_SNAPSHOT;
  }, [runtime]);

  const getServerSnapshot = useCallback(() => {
    return runtime?.getServerSnapshot() ?? EMPTY_SERVER_SNAPSHOT;
  }, [runtime]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const callRuntime = useCallback(
    async <T>(action: (target: AgentConversationRuntime) => Promise<RuntimeActionResult<T>>) => {
      if (!runtime) {
        return { error: undefined };
      }

      const response = await action(runtime);
      if (response.error) {
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [runtime, propsRef]
  );

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
    const response = await callRuntime((target) => target.fetchMore());

    return {
      ...response,
      error: response.error as NovuError | undefined,
      data: response.data
        ? {
            messages: [...response.data.messages],
            hasMore: response.data.hasMore,
          }
        : undefined,
    };
  }, [callRuntime]);

  const paginationWithFetch = useMemo(
    () => ({
      status: snapshot.pagination.status,
      hasMore: snapshot.pagination.hasMore,
      fetchMore,
    }),
    [snapshot.pagination.status, snapshot.pagination.hasMore, fetchMore]
  );

  const sendMessage = useCallback((text: string) => callRuntime((target) => target.sendMessage(text)), [callRuntime]);
  const respondToAction = useCallback(
    (args: { actionId: string; decision: AgentToolApprovalDecision }) =>
      callRuntime((target) => target.respondToAction(args)),
    [callRuntime]
  );
  const sendAction = useCallback(
    (args: { actionId: string; sourceMessageId: string; value?: string }) =>
      callRuntime((target) => target.sendAction(args)),
    [callRuntime]
  );
  const retryMessage = useCallback(
    (messageId: string) => callRuntime((target) => target.retryMessage(messageId)),
    [callRuntime]
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
