import type {
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
  SendMessageInput,
  SendMessageResult,
  WebChatPagination,
  WebChatPlanLimitError,
} from '@novu/js';
import { NovuError } from '@novu/js';
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useNovu } from './NovuProvider';

type UseWebChatCallbacks = {
  onSuccess?: (data: LoadConversationResult) => void;
  onError?: (error: NovuError | WebChatPlanLimitError) => void;
  /**
   * Fires once when a message id first appears. History pages do not fire.
   * The first event of a turn can create an empty assistant message before text arrives.
   * A send that never reaches the server does not fire. The message status becomes `failed` instead.
   */
  onMessage?: (message: AgentMessage) => void;
  /**
   * Fires once per pending action, including actions still pending on mount.
   * Paging backwards does not fire.
   */
  onActionRequested?: (action: AgentPendingAction) => void;
  /**
   * Live event envelopes for this conversation.
   * Duplicates that the client drops do not fire.
   * Envelopes that arrive before the conversation id exists do not fire.
   * The message list in this render does not include this envelope yet.
   */
  onEvent?: (envelope: AgentEventEnvelope) => void;
};

/** Arguments for {@link useWebChat}. Pass `agentId`, or pass `conversation`. Do not mix the two. */
export type UseWebChatProps = UseWebChatCallbacks &
  AgentHashFields &
  (
    | {
        agentId: string;
        /**
         * Resume this conversation. The hook loads history on mount.
         * Omit this prop to start a new chat. The first send creates a conversation.
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

/** State and actions returned by {@link useWebChat}. */
export type UseWebChatResult = {
  /** Conversation timeline. */
  messages: AgentMessage[];
  /** Tool approvals and MCP connect items that are still pending. */
  pendingActions: AgentPendingAction[];
  /** Server conversation id after create or resume. */
  conversationId?: string;
  /** Last error from load, send, retry, or action. */
  error?: NovuError | WebChatPlanLimitError;
  /** True while Web Chat loads and, for an existing conversation, until the first history fetch completes. */
  isLoading: boolean;
  /** True while the agent turn is in progress. Same as `run.isRunning`. */
  isRunning: boolean;
  /** Typing indicator. Same as `run.typing`. Absent when the agent is not typing. */
  typing?: AgentConversationRunSnapshot['typing'];
  /** `'active'` or `'resolved'`. The agent sets `resolved` with `ctx.resolve()`. Not a loading flag. */
  conversationStatus: AgentConversationStatus;
  /** Current agent-run snapshot. */
  run: AgentConversationRunSnapshot;
  /** Older-history control. Not a top-level `hasMore` or `fetchMore`. */
  pagination: WebChatPagination & {
    fetchMore: () => Promise<{
      data?: { messages: AgentMessage[]; hasMore: boolean };
      error?: NovuError;
    }>;
  };
  /** True while reconnect recovery is in progress. */
  isRecovering: boolean;
  /** Set when reconnect recovery fails. Separate from send and fetch `error`. */
  catchUpError?: NovuError;
  /** Reload the newest history page. No-op when there is no conversation id. */
  refetch: () => Promise<void>;
  /** Send a user message. `input` is a string, or `{ text, metadata }`. Creates a conversation when `conversationId` is omitted. */
  sendMessage: (input: SendMessageInput) => Promise<{
    data?: SendMessageResult;
    error?: NovuError | WebChatPlanLimitError;
  }>;
  /** Resolve a pending `tool-approval`. Pass `action.id` from `pendingActions`. */
  respondToAction: (args: { actionId: string; decision: AgentToolApprovalDecision }) => Promise<{
    data?: RespondToActionResult;
    error?: NovuError | WebChatPlanLimitError;
  }>;
  /** Click a Card button. Do not use this for tool approval. */
  sendAction: (args: { actionId: string; sourceMessageId: string; value?: string }) => Promise<{
    data?: SendActionResult;
    error?: NovuError | WebChatPlanLimitError;
  }>;
  /** Resend a message whose `status` is `failed`. Reuses the original idempotency key. */
  retryMessage: (messageId: string) => Promise<{
    data?: SendMessageResult;
    error?: NovuError | WebChatPlanLimitError;
  }>;
  /**
   * Start a new empty chat for the current `agentId`. The next `sendMessage` creates the server conversation.
   * No-op when `conversationId` or `conversation` is provided.
   */
  startNewConversation: () => void;
};

const EMPTY_SERVER_SNAPSHOT = {
  key: 'ssr',
  status: 'loading',
  run: { isRunning: false },
  conversationStatus: 'active',
  pagination: { hasMore: false, status: 'idle' },
  messages: [],
  pendingActions: [],
  isRecovering: false,
} as AgentConversationSnapshot;

type RuntimeActionResult<T> = {
  data?: T;
  error?: NovuError | WebChatPlanLimitError;
};

function handlePublicationCallbacks(args: {
  snapshot: AgentConversationSnapshot;
  meta: AgentConversationPublicationMeta | undefined;
  conversationIdProp: string | undefined;
  propsRef: ReturnType<typeof useDataRef<UseWebChatProps>>;
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
      propsRef.current.onError?.(snapshot.error as NovuError | WebChatPlanLimitError);
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

function getManagedRuntimeKey(
  agentId: string,
  agentHash: string | undefined,
  conversationIdProp: string | undefined,
  createEpoch: number
): string {
  if (conversationIdProp) {
    return `resume:${agentId}\0${agentHash ?? ''}\0${conversationIdProp}`;
  }

  return `${getCreateFlowKey(agentId, agentHash)}\0${createEpoch}`;
}

type ManagedRuntimeEntry = {
  key: string;
  runtime: AgentConversationRuntime;
};

type WebChatLoadState =
  | { novu: ReturnType<typeof useNovu>; status: 'loading' }
  | { novu: ReturnType<typeof useNovu>; status: 'ready' }
  | { novu: ReturnType<typeof useNovu>; status: 'error'; error: NovuError };

function toNovuError(error: unknown): NovuError {
  if (error instanceof NovuError) {
    return error;
  }

  if (error instanceof Error) {
    return new NovuError('Failed to load Web Chat', error);
  }

  return new NovuError('Failed to load Web Chat', new Error(String(error)));
}

/**
 * Headless Web Chat client. Use it inside `NovuProvider`.
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, isRunning, isLoading, error } = useWebChat({
 *   agentId: 'YOUR_AGENT_IDENTIFIER',
 * });
 * ```
 */
export const useWebChat = (props: UseWebChatProps): UseWebChatResult => {
  const novu = useNovu();
  const propsRef = useDataRef(props);
  const [loadState, setLoadState] = useState<WebChatLoadState>(() => ({
    novu,
    status: 'loading',
  }));

  useEffect(() => {
    let cancelled = false;

    if (!novu.isWebChatLoaded) {
      setLoadState({ novu, status: 'loading' });
    }

    void novu
      .loadWebChat()
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

  const webChatReady = loadState.novu === novu && loadState.status === 'ready';
  const webChatLoadError = loadState.novu === novu && loadState.status === 'error' ? loadState.error : undefined;
  const isWebChatLoading = loadState.novu !== novu || loadState.status === 'loading';

  const sharedRuntime = 'conversation' in props ? props.conversation : undefined;
  const agentId = sharedRuntime?.agentId ?? props.agentId!;
  const conversationIdProp = sharedRuntime ? undefined : props.conversationId;
  const agentHash = sharedRuntime ? undefined : props.agentHash;

  const ownedRuntimeRef = useRef<OwnedRuntimeEntry | null>(null);
  const [managedRuntime, setManagedRuntime] = useState<ManagedRuntimeEntry | null>(null);
  const [createEpoch, setCreateEpoch] = useState(0);
  const managedRuntimeKey = sharedRuntime
    ? null
    : getManagedRuntimeKey(agentId, agentHash, conversationIdProp, createEpoch);

  useEffect(() => {
    if (sharedRuntime) {
      ownedRuntimeRef.current?.runtime.dispose();
      ownedRuntimeRef.current = null;
      setManagedRuntime(null);

      return;
    }

    if (!webChatReady || !managedRuntimeKey) {
      setManagedRuntime(null);

      return;
    }

    const key = managedRuntimeKey;
    const current = ownedRuntimeRef.current;

    let runtime: AgentConversationRuntime;
    if (current?.novu === novu && current.key === key) {
      runtime = current.runtime;
    } else {
      current?.runtime.dispose();
      runtime = conversationIdProp
        ? novu.webChat.conversation({ agentId, conversationId: conversationIdProp, agentHash })
        : novu.webChat.conversation({ agentId, agentHash });
      ownedRuntimeRef.current = { key, novu, runtime };
    }

    setManagedRuntime({ key, runtime });

    return () => {
      ownedRuntimeRef.current?.runtime.dispose();
      ownedRuntimeRef.current = null;
      setManagedRuntime(null);
    };
  }, [webChatReady, sharedRuntime, novu, agentId, conversationIdProp, agentHash, createEpoch, managedRuntimeKey]);

  const runtime =
    sharedRuntime ?? (managedRuntime?.key === managedRuntimeKey ? managedRuntime.runtime : null);

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
          webChatLoadError ??
          new NovuError(
            isWebChatLoading ? 'Web Chat is still loading' : 'Web Chat runtime is unavailable',
            new Error('Web Chat runtime is not ready')
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
    [runtime, webChatLoadError, isWebChatLoading, propsRef]
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

  const sendMessage = useCallback(
    (input: SendMessageInput) => callRuntime((target) => target.sendMessage(input)),
    [callRuntime]
  );
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
  const startNewConversation = useCallback(() => {
    if (sharedRuntime || conversationIdProp) {
      return;
    }

    setCreateEpoch((epoch) => epoch + 1);
  }, [sharedRuntime, conversationIdProp]);

  return {
    messages: [...snapshot.messages],
    pendingActions: [...snapshot.pendingActions],
    conversationId: snapshot.conversationId,
    error: webChatLoadError ?? (snapshot.error as UseWebChatResult['error']),
    isLoading: !webChatLoadError && (isWebChatLoading || snapshot.status === 'loading'),
    isRunning: snapshot.run.isRunning,
    typing: snapshot.run.typing,
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
    startNewConversation,
  };
};
