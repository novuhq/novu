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
  RespondToActionResult,
  SendActionResult,
  SendMessageResult,
} from '@novu/js';
import { NovuError } from '@novu/js';
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
  /** True while Agent Chat loads and, for an existing conversation, until the first history fetch completes. */
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
  status: 'loading',
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

type OwnedRuntimeEntry = {
  key: string;
  novu: ReturnType<typeof useNovu>;
  runtime: AgentConversationRuntime;
};

function getCreateFlowKey(agentId: string, agentHash?: string): string {
  return `${agentId}\0${agentHash ?? ''}`;
}

function resolveOwnedRuntime(args: {
  novu: ReturnType<typeof useNovu>;
  agentId: string;
  agentHash?: string;
  ownedRuntimeRef: MutableRefObject<OwnedRuntimeEntry | null>;
}): AgentConversationRuntime | null {
  const key = getCreateFlowKey(args.agentId, args.agentHash);
  const current = args.ownedRuntimeRef.current;

  if (current?.novu === args.novu && current.key === key) {
    return current.runtime;
  }

  current?.runtime.dispose();

  const result = args.novu.agentChat.conversation({ agentId: args.agentId, agentHash: args.agentHash });
  if (!result.ok) {
    args.ownedRuntimeRef.current = null;
    return null;
  }

  args.ownedRuntimeRef.current = { key, novu: args.novu, runtime: result.data };
  return result.data;
}

type AgentChatLoadState =
  | { novu: ReturnType<typeof useNovu>; status: 'loading' }
  | { novu: ReturnType<typeof useNovu>; status: 'ready' }
  | { novu: ReturnType<typeof useNovu>; status: 'error'; error: NovuError };

function toNovuError(error: unknown): NovuError {
  if (error instanceof NovuError) {
    return error;
  }

  if (error instanceof Error) {
    return new NovuError('Failed to load Agent Chat', error);
  }

  return new NovuError('Failed to load Agent Chat', new Error(String(error)));
}

export const useAgentChat = (props: UseAgentChatProps): UseAgentChatResult => {
  const novu = useNovu();
  const propsRef = useDataRef(props);
  const [loadState, setLoadState] = useState<AgentChatLoadState>(() => ({
    novu,
    // Always start loading. Node SSR can see `isAgentChatLoaded` as true (eager
    // import) while the browser first paint is still false — that mismatch
    // hydrates an empty thread against a "Loading conversation" row.
    status: 'loading',
  }));

  useEffect(() => {
    let cancelled = false;

    if (!novu.isAgentChatLoaded) {
      setLoadState({ novu, status: 'loading' });
    }

    void novu
      .loadAgentChat()
      .then(() => {
        if (!cancelled) {
          setLoadState({ novu, status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const novuError = toNovuError(error);
        propsRef.current.onError?.(novuError);
        setLoadState({ novu, status: 'error', error: novuError });
      });

    return () => {
      cancelled = true;
    };
  }, [novu, propsRef]);

  const agentChatReady = loadState.novu === novu && loadState.status === 'ready';
  const agentChatLoadError = loadState.novu === novu && loadState.status === 'error' ? loadState.error : undefined;
  const isAgentChatLoading = loadState.novu !== novu || loadState.status === 'loading';

  const sharedRuntime = 'conversation' in props ? props.conversation : undefined;
  const agentId = sharedRuntime?.agentId ?? props.agentId!;
  const conversationIdProp = sharedRuntime ? undefined : props.conversationId;
  const agentHash = sharedRuntime ? undefined : props.agentHash;

  const ownedRuntimeRef = useRef<OwnedRuntimeEntry | null>(null);

  useEffect(() => {
    const current = ownedRuntimeRef.current;
    if (current && current.novu !== novu) {
      current.runtime.dispose();
      ownedRuntimeRef.current = null;
    }
  }, [novu]);

  const cachedRuntime = useMemo(() => {
    if (!agentChatReady) {
      return null;
    }

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
  }, [agentChatReady, sharedRuntime, novu, agentId, conversationIdProp, agentHash]);

  if (sharedRuntime || conversationIdProp) {
    ownedRuntimeRef.current?.runtime.dispose();
    ownedRuntimeRef.current = null;
  }

  const ownedRuntime =
    !agentChatReady || sharedRuntime || conversationIdProp
      ? null
      : resolveOwnedRuntime({ novu, agentId, agentHash, ownedRuntimeRef });

  const runtime = sharedRuntime ?? cachedRuntime ?? ownedRuntime;

  useEffect(() => {
    return () => {
      ownedRuntimeRef.current?.runtime.dispose();
      ownedRuntimeRef.current = null;
    };
  }, []);

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
        const error =
          agentChatLoadError ??
          new NovuError(
            isAgentChatLoading ? 'Agent Chat is still loading' : 'Agent Chat runtime is unavailable',
            new Error('Agent Chat runtime is not ready')
          );
        propsRef.current.onError?.(error);

        return { error };
      }

      const response = await action(runtime);
      if (response.error) {
        propsRef.current.onError?.(response.error);
      }

      return response;
    },
    [runtime, agentChatLoadError, isAgentChatLoading, propsRef]
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
    error: agentChatLoadError ?? (snapshot.error as UseAgentChatResult['error']),
    isLoading: !agentChatLoadError && (isAgentChatLoading || snapshot.status === 'loading'),
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
