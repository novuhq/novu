import type { AgentEventEnvelope } from '@novu/js';
import { useWebChat } from '@novu/react';
import { COPILOT_TRY_AGAIN_READY_EVENT, CopilotReviewActionEnum } from '@novu/shared';
import { type ComponentProps, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCopilotConnectContext } from '@/components/connect/copilot-connect-context';
import { CopilotConnectProvider } from '@/components/connect/copilot-connect-provider';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { NOVU_COPILOT_AGENT_ID } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { registerCopilotEntry } from './copilot-entry-store';
import {
  CopilotRegisterContext,
  CopilotSidebarControlContext,
  type CopilotSurface,
  CopilotWebChatContext,
  type CopilotWebChatContextValue,
} from './copilot-web-chat-context';
import {
  buildCopilotMetadata,
  type CopilotCardAction,
  type CopilotPageContext,
  getFailedSend,
  getUserMessageText,
  hasPendingReplyGap,
  isCopilotReviewActionId,
  loadTryAgainPrompt,
  readStoredConversationId,
  writeStoredConversationId,
} from './copilot-web-chat-utils';
import { useCopilotHotkey } from './use-copilot-hotkey';
import { useCopilotRefetch } from './use-copilot-refetch';

type ShellState = {
  isOpen: boolean;
  open: CopilotWebChatContextValue['open'];
  close: () => void;
  toggle: () => void;
  draft: string;
  setDraft: (value: string) => void;
  isRevealPending: boolean;
  completeReveal: () => void;
  hasSidebar: boolean;
  registerSidebar: () => () => void;
  pageContext?: CopilotPageContext;
  registerPageContext: ComponentProps<typeof CopilotRegisterContext.Provider>['value'];
  onRefetchRef: React.MutableRefObject<(() => void) | undefined>;
};

function useShellState(surface: CopilotSurface | null): ShellState {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isRevealPending, setIsRevealPending] = useState(false);
  const [sidebarCount, setSidebarCount] = useState(0);
  const [pageContext, setPageContext] = useState<CopilotPageContext>();
  const onRefetchRef = useRef<(() => void) | undefined>(undefined);

  const open = useCallback<ShellState['open']>(
    (options) => {
      if (options?.prefill) setDraft(options.prefill);
      setIsRevealPending(true);
      if (surface === 'popover') setIsOpen(true);
    },
    [surface]
  );
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close]);
  const completeReveal = useCallback(() => setIsRevealPending(false), []);
  const registerSidebar = useCallback(() => {
    setSidebarCount((count) => count + 1);

    return () => setSidebarCount((count) => count - 1);
  }, []);

  const registerPageContext = useCallback((context: CopilotPageContext, onRefetch?: () => void) => {
    setPageContext(context);
    onRefetchRef.current = onRefetch;

    return () => {
      setPageContext((current) => (current === context ? undefined : current));
      if (onRefetchRef.current === onRefetch) onRefetchRef.current = undefined;
    };
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    draft,
    setDraft,
    isRevealPending,
    completeReveal,
    hasSidebar: sidebarCount > 0,
    registerSidebar,
    pageContext,
    registerPageContext,
    onRefetchRef,
  };
}

type BridgeShell = Pick<
  ShellState,
  'isOpen' | 'open' | 'close' | 'toggle' | 'hasSidebar' | 'pageContext' | 'onRefetchRef'
>;

type ConnectedState = Pick<
  CopilotWebChatContextValue,
  | 'chat'
  | 'sendMessage'
  | 'retry'
  | 'stop'
  | 'sendCardAction'
  | 'pendingReviewMessageId'
  | 'startNewConversation'
  | 'hasUnseenAnswer'
  | 'hasRunError'
  | 'isBusy'
>;

/**
 * Hosts one Copilot conversation for the whole workflow editor so it survives canvas and step
 * editor navigation. The web-chat connection lives in a sibling bridge (rendered once Novu's
 * tenant context is minted, never on self-hosted) so children are never remounted when it
 * becomes ready; until then the context reports `isAvailable: false` ("Copilot is off") and, until
 * the bridge mounts, `isConnecting: true`.
 */
export function CopilotWebChatProvider({
  children,
  surface,
  conversationScope,
}: {
  children: ReactNode;
  /** Where the conversation is shown, or `null` to not connect; picks the hotkeys and tags every Copilot telemetry event. */
  surface: CopilotSurface | null;
  /** Account, environment, and workflow the thread belongs to; it is resumed after a reload and reset when the scope changes. */
  conversationScope?: string;
}) {
  const shell = useShellState(surface);
  const [connected, setConnected] = useState<ConnectedState | null>(null);
  // The bridge mounts once the tenant context has been minted or failed to; failing leaves `connected` empty.
  const [isBridgeMounted, setIsBridgeMounted] = useState(false);
  const {
    isOpen,
    open,
    close,
    toggle,
    draft,
    setDraft,
    isRevealPending,
    completeReveal,
    hasSidebar,
    registerSidebar,
    pageContext,
    registerPageContext,
    onRefetchRef,
  } = shell;
  // Memoized so the bridge (wrapped in `memo`) is not re-rendered by the parent's own state updates;
  // `useWebChat` returns a new object every render, which would otherwise loop through `onConnected`.
  const bridgeShell = useMemo(
    () => ({ isOpen, open, close, toggle, hasSidebar, pageContext, onRefetchRef }),
    [isOpen, open, close, toggle, hasSidebar, pageContext, onRefetchRef]
  );

  const isBusy = !!connected?.isBusy;
  const sidebarControl = useMemo(
    () => ({ isGenerating: isBusy, isRevealPending, registerSidebar }),
    [isBusy, isRevealPending, registerSidebar]
  );

  const value = useMemo<CopilotWebChatContextValue>(
    () => ({
      isAvailable: !!connected,
      isConnecting: surface !== null && !isBridgeMounted,
      surface,
      isOpen,
      open,
      close,
      toggle,
      chat: connected?.chat,
      pageContext,
      sendMessage: connected?.sendMessage ?? (async () => false),
      retry: connected?.retry ?? (async () => {}),
      stop: connected?.stop ?? (async () => {}),
      sendCardAction: connected?.sendCardAction ?? (async () => {}),
      pendingReviewMessageId: connected?.pendingReviewMessageId,
      startNewConversation: connected?.startNewConversation ?? (() => {}),
      draft,
      setDraft,
      isRevealPending,
      completeReveal,
      hasUnseenAnswer: !!connected?.hasUnseenAnswer && !isOpen,
      hasRunError: !!connected?.hasRunError,
      isBusy,
    }),
    [
      connected,
      isBridgeMounted,
      surface,
      isOpen,
      open,
      close,
      toggle,
      pageContext,
      draft,
      setDraft,
      isRevealPending,
      completeReveal,
      isBusy,
    ]
  );

  return (
    <CopilotRegisterContext.Provider value={registerPageContext}>
      <CopilotSidebarControlContext.Provider value={sidebarControl}>
        <CopilotWebChatContext.Provider value={value}>
          {children}
          {surface && (
            <CopilotConnectProvider>
              <CopilotWebChatBridge
                key={conversationScope}
                shell={bridgeShell}
                surface={surface}
                conversationScope={conversationScope}
                onConnected={setConnected}
                onMountedChange={setIsBridgeMounted}
              />
            </CopilotConnectProvider>
          )}
        </CopilotWebChatContext.Provider>
      </CopilotSidebarControlContext.Provider>
    </CopilotRegisterContext.Provider>
  );
}

const CopilotWebChatBridge = memo(function CopilotWebChatBridge({
  shell,
  surface,
  conversationScope,
  onConnected,
  onMountedChange,
}: {
  shell: BridgeShell;
  surface: CopilotSurface;
  conversationScope?: string;
  onConnected: (state: ConnectedState | null) => void;
  onMountedChange: (isMounted: boolean) => void;
}) {
  const track = useTelemetry();
  const connectContext = useCopilotConnectContext();
  const { isOpen, open, close, toggle, hasSidebar, pageContext, onRefetchRef } = shell;
  const [unseenAnswer, setUnseenAnswer] = useState(false);
  const [runError, setRunError] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [pendingReviewMessageId, setPendingReviewMessageId] = useState<string>();
  const [isStopPending, setIsStopPending] = useState(false);
  // A Try again click records its card; the agent's ready event names the prompt to resend in `readyPrompt`, which is sent once the run settles.
  const tryAgainCardRef = useRef<string | undefined>(undefined);
  const readyPromptLookupRef = useRef(0);
  const [readyPrompt, setReadyPrompt] = useState<string>();
  const navigate = useNavigate();
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const pageContextRef = useRef(pageContext);
  pageContextRef.current = pageContext;
  const { currentEnvironment } = useEnvironment();
  const environmentIdRef = useRef(currentEnvironment?._id);
  environmentIdRef.current = currentEnvironment?._id;
  const environmentSlugRef = useRef(currentEnvironment?.slug);
  environmentSlugRef.current = currentEnvironment?.slug;

  useEffect(() => {
    if (isOpen) setUnseenAnswer(false);
  }, [isOpen]);

  const handleRunEvent = useCallback(
    (envelope: AgentEventEnvelope) => {
      const { event } = envelope;

      if (event.type === 'run-start') {
        // From here `chat.isRunning` reports the run; the local flag only bridges send → run-start.
        setAwaitingReply(false);
        setRunError(false);
      } else if (event.type === 'run-finish') {
        setAwaitingReply(false);
        // A Try again run that finished without the ready event reverted nothing to retry from.
        tryAgainCardRef.current = undefined;
        // A failed revert answers in plain text, so the review card is still the latest card and can be clicked again.
        setPendingReviewMessageId(undefined);
        track(TelemetryEvent.COPILOT_GENERATION_COMPLETED, {
          outcome: event.outcome,
          agentId: NOVU_COPILOT_AGENT_ID,
          surface,
        });
        // A stopped run has no answer to come back to.
        if (event.outcome === 'completed' && !isOpenRef.current) setUnseenAnswer(true);
      } else if (event.type === 'run-error') {
        setAwaitingReply(false);
        tryAgainCardRef.current = undefined;
        readyPromptLookupRef.current++;
        setReadyPrompt(undefined);
        setPendingReviewMessageId(undefined);
        track(TelemetryEvent.COPILOT_GENERATION_ERROR, { code: event.code, agentId: NOVU_COPILOT_AGENT_ID, surface });
        setRunError(true);
      } else if (event.type === 'custom' && event.name === COPILOT_TRY_AGAIN_READY_EVENT) {
        const cardSourceMessageId = tryAgainCardRef.current;
        tryAgainCardRef.current = undefined;
        if (cardSourceMessageId) {
          const lookup = ++readyPromptLookupRef.current;
          const { messages, pagination } = chatRef.current;
          void loadTryAgainPrompt({
            messages,
            hasMore: pagination.hasMore,
            fetchMore: pagination.fetchMore,
            readyEventData: event.data,
            cardSourceMessageId,
          }).then((prompt) => {
            // A Stop or New chat while older history loaded owes no resend.
            if (lookup === readyPromptLookupRef.current) setReadyPrompt(prompt);
          });
        }
      }
    },
    [track, surface]
  );

  const handleWorkflowDeleted = useCallback(
    (workflowId: string) => {
      const environmentSlug = environmentSlugRef.current;
      if (!environmentSlug || pageContextRef.current?.workflowId !== workflowId) return false;

      void navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug }));

      return true;
    },
    [navigate]
  );

  const onEvent = useCopilotRefetch(onRefetchRef, handleRunEvent, handleWorkflowDeleted);
  const [resumeConversationId, setResumeConversationId] = useState(() => readStoredConversationId(conversationScope));
  const chat = useWebChat({ agentId: NOVU_COPILOT_AGENT_ID, conversationId: resumeConversationId, onEvent });
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const isBusyRef = useRef(false);
  const pendingActionRef = useRef<Promise<unknown> | undefined>(undefined);
  const resumeConversationIdRef = useRef(resumeConversationId);
  resumeConversationIdRef.current = resumeConversationId;

  useEffect(() => {
    if (chat.conversationId) writeStoredConversationId(conversationScope, chat.conversationId);
  }, [conversationScope, chat.conversationId]);

  // A stored conversation that fails to load stays selected: the error notice offers Retry (reload history), and
  // New chat drops it. Abandoning it here would let a transient error replace the saved thread.
  const isResumeBroken = !!resumeConversationId && !!chat.error && !chat.isLoading && chat.messages.length === 0;
  const lastSentRef = useRef<{ text: string; metadata: ReturnType<typeof buildCopilotMetadata> } | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      // The client rejects sends during a run, so refuse up front and let the composer keep the text.
      if (!trimmed || chatRef.current.isLoading || isBusyRef.current) return false;

      // A newer request replaces a Try again prompt still being looked up, so it is not resent after this one.
      readyPromptLookupRef.current++;
      setReadyPrompt(undefined);

      const isNewChat = chatRef.current.messages.length === 0;
      track(TelemetryEvent.COPILOT_MESSAGE_SENT, {
        agentId: NOVU_COPILOT_AGENT_ID,
        isNewChat,
        messageLength: trimmed.length,
        surface,
      });
      if (isNewChat) track(TelemetryEvent.COPILOT_CHAT_CREATED, { agentId: NOVU_COPILOT_AGENT_ID, surface });

      setRunError(false);
      const metadata = buildCopilotMetadata(pageContextRef.current, environmentIdRef.current);
      const userMessageIndex = chatRef.current.messages.filter((message) => message.role === 'user').length;
      lastSentRef.current = { text: trimmed, metadata };
      setAwaitingReply(true);
      const { error } = await chatRef.current.sendMessage({ text: trimmed, metadata });
      if (!error) return true;

      setAwaitingReply(false);
      // A send rejected before it reached the thread (e.g. the session failed to start) leaves no failed message to retry,
      // so surface the error and let the composer keep the prompt.
      const savedUserMessages = chatRef.current.messages.filter((message) => message.role === 'user').length;
      if (savedUserMessages > userMessageIndex) return true;

      setRunError(true);

      return false;
    },
    [track, surface]
  );

  const retry = useCallback(async () => {
    if (chatRef.current.isLoading) return;

    // Reconnect catch-up or the resumed history load failed: reload the thread instead of resending the edit.
    const isHistoryBroken =
      !!resumeConversationIdRef.current && !!chatRef.current.error && chatRef.current.messages.length === 0;
    if (chatRef.current.catchUpError || isHistoryBroken) {
      setRunError(false);
      await chatRef.current.refetch();

      return;
    }

    // A send that never got accepted is replayed with its original idempotency key, so a lost response can't apply the edit twice.
    // Checked first: the failed message is in the thread even when `lastSentRef` was lost to a reload.
    const lastUserMessage = chatRef.current.messages.filter((message) => message.role === 'user').at(-1);
    if (lastUserMessage?.status === 'failed') {
      setRunError(false);
      setAwaitingReply(true);
      const { error } = await chatRef.current.retryMessage(lastUserMessage.id);
      if (error) setAwaitingReply(false);

      return;
    }

    // After a reload `lastSentRef` is empty; the stored conversation is scoped to this workflow, so rebuild from the page.
    const lastSent =
      lastSentRef.current ??
      (lastUserMessage
        ? {
            text: getUserMessageText(lastUserMessage),
            metadata: buildCopilotMetadata(pageContextRef.current, environmentIdRef.current),
          }
        : null);
    if (!lastSent?.text) return;

    setRunError(false);
    setAwaitingReply(true);
    const { error } = await chatRef.current.sendMessage(lastSent);
    if (error) setAwaitingReply(false);
  }, []);

  const stop = useCallback(async () => {
    track(TelemetryEvent.COPILOT_GENERATION_STOPPED, { agentId: NOVU_COPILOT_AGENT_ID, surface });
    // Nothing is owed after a stop: drop the send → run-start bridge, a queued Try again resend and the locked review card.
    setAwaitingReply(false);
    tryAgainCardRef.current = undefined;
    readyPromptLookupRef.current++;
    setReadyPrompt(undefined);
    setPendingReviewMessageId(undefined);

    // Cancel only finds the turn a review click starts once the click is accepted; an earlier Stop would answer idle.
    // Bound to this chat, so a New chat meanwhile can't redirect the cancel; the composer stays locked so no new send is hit.
    const stopTurn = chatRef.current.stop;
    setIsStopPending(true);
    try {
      await pendingActionRef.current;
      const { error } = await stopTurn();
      if (error) showErrorToast("Couldn't stop the Copilot. Try again.");
    } finally {
      setIsStopPending(false);
    }
  }, [track, surface]);

  const sendCardAction = useCallback(async (action: CopilotCardAction) => {
    if (isCopilotReviewActionId(action.actionId)) {
      setPendingReviewMessageId(action.sourceMessageId);
      tryAgainCardRef.current =
        action.actionId === CopilotReviewActionEnum.TRY_AGAIN ? action.sourceMessageId : undefined;
      // The run the click starts writes the workflow, so the composer waits for it like for a sent message.
      setAwaitingReply(true);
    }

    const request = chatRef.current.sendAction(action);
    pendingActionRef.current = request;
    const { error } = await request;
    if (pendingActionRef.current === request) pendingActionRef.current = undefined;
    if (!error) return;

    // The click never reached the agent, so the card stays the user's way to try it again.
    setAwaitingReply(false);
    setPendingReviewMessageId(undefined);
    tryAgainCardRef.current = undefined;
    showErrorToast("Couldn't reach the Copilot. Try again.");
  }, []);

  const startNewConversation = useCallback(() => {
    lastSentRef.current = null;
    tryAgainCardRef.current = undefined;
    readyPromptLookupRef.current++;
    setReadyPrompt(undefined);
    setPendingReviewMessageId(undefined);
    setRunError(false);
    setAwaitingReply(false);
    writeStoredConversationId(conversationScope, undefined);

    // `startNewConversation` is a no-op on a resumed conversation; dropping the id switches the hook to a new chat.
    if (resumeConversationIdRef.current) setResumeConversationId(undefined);
    else chatRef.current.startNewConversation();
  }, [conversationScope]);

  const isAvailable = !!connectContext;
  // A reveal nothing can show yet would wait for the next sidebar and steal the focus then (e.g. ⌘J on the Activity tab).
  const canReveal = surface === 'popover' || hasSidebar;
  const isEntryEnabled = isAvailable && !!pageContext?.workflowId && canReveal;
  useCopilotHotkey({ surface, isEnabled: isEntryEnabled, isOpen, open, toggle, close });
  useEffect(() => (isEntryEnabled ? registerCopilotEntry(open) : undefined), [isEntryEnabled, open]);

  // `chat.error` stays set while a failed send is retried, so failures are read from the run and the message instead.
  const hasRunError = runError || isResumeBroken || !!chat.catchUpError || !!getFailedSend(chat.messages);
  const isBusy =
    !hasRunError &&
    (isStopPending ||
      chat.isRunning ||
      (awaitingReply && (!!pendingReviewMessageId || hasPendingReplyGap(chat.messages))));
  isBusyRef.current = isBusy;

  // The ready event arrives while the run that reverted the turn is still open, and a send is refused until it settles.
  useEffect(() => {
    if (!readyPrompt || isBusy) return;

    setReadyPrompt(undefined);
    void sendMessage(readyPrompt);
  }, [readyPrompt, isBusy, sendMessage]);

  useEffect(() => {
    if (!isAvailable) {
      onConnected(null);

      return;
    }

    onConnected({
      chat,
      sendMessage,
      retry,
      stop,
      sendCardAction,
      pendingReviewMessageId,
      startNewConversation,
      hasUnseenAnswer: unseenAnswer,
      hasRunError,
      isBusy,
    });
  }, [
    isAvailable,
    chat,
    sendMessage,
    retry,
    stop,
    sendCardAction,
    pendingReviewMessageId,
    startNewConversation,
    unseenAnswer,
    hasRunError,
    isBusy,
    onConnected,
  ]);

  useEffect(() => () => onConnected(null), [onConnected]);

  useEffect(() => {
    onMountedChange(true);

    return () => onMountedChange(false);
  }, [onMountedChange]);

  return null;
});
