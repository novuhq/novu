import type { AgentEventEnvelope } from '@novu/js';
import { useWebChat } from '@novu/react';
import { type ComponentProps, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCopilotConnectContext } from '@/components/connect/copilot-connect-context';
import { CopilotConnectProvider } from '@/components/connect/copilot-connect-provider';
import { NOVU_COPILOT_AGENT_ID } from '@/config';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import {
  CopilotRegisterContext,
  CopilotWebChatContext,
  type CopilotWebChatContextValue,
} from './copilot-web-chat-context';
import {
  buildCopilotMetadata,
  type CopilotPageContext,
  getFailedSend,
  hasPendingReplyGap,
  readStoredConversationId,
  writeStoredConversationId,
} from './copilot-web-chat-utils';
import { useCopilotHotkey } from './use-copilot-hotkey';
import { useCopilotRefetch } from './use-copilot-refetch';

type ShellState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  pageContext?: CopilotPageContext;
  registerPageContext: ComponentProps<typeof CopilotRegisterContext.Provider>['value'];
  onRefetchRef: React.MutableRefObject<(() => void) | undefined>;
};

function useShellState(): ShellState {
  const [isOpen, setIsOpen] = useState(false);
  const [pageContext, setPageContext] = useState<CopilotPageContext>();
  const onRefetchRef = useRef<(() => void) | undefined>(undefined);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const registerPageContext = useCallback((context: CopilotPageContext, onRefetch?: () => void) => {
    setPageContext(context);
    onRefetchRef.current = onRefetch;

    return () => {
      setPageContext((current) => (current === context ? undefined : current));
      if (onRefetchRef.current === onRefetch) onRefetchRef.current = undefined;
    };
  }, []);

  return { isOpen, open, close, toggle, pageContext, registerPageContext, onRefetchRef };
}

type BridgeShell = Pick<ShellState, 'isOpen' | 'close' | 'toggle' | 'pageContext' | 'onRefetchRef'>;

type ConnectedState = Pick<
  CopilotWebChatContextValue,
  | 'chat'
  | 'sendMessage'
  | 'retry'
  | 'startNewConversation'
  | 'hasUnseenAnswer'
  | 'hasRunError'
  | 'sentContextLabels'
  | 'isBusy'
>;

/**
 * Hosts one Copilot conversation for the whole workflow editor so it survives canvas and step
 * editor navigation. The web-chat connection lives in a sibling bridge (rendered once Novu's
 * tenant context is minted, never on self-hosted) so children are never remounted when it
 * becomes ready; until then the context reports `isAvailable: false` ("Copilot is off").
 */
export function CopilotWebChatProvider({
  children,
  enabled = true,
  conversationScope,
}: {
  children: ReactNode;
  enabled?: boolean;
  /** Environment + workflow the thread belongs to; it is resumed after a reload and reset when the scope changes. */
  conversationScope?: string;
}) {
  const shell = useShellState();
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState<ConnectedState | null>(null);
  const { isOpen, open, close, toggle, pageContext, registerPageContext, onRefetchRef } = shell;
  // Memoized so the bridge (wrapped in `memo`) is not re-rendered by the parent's own state updates;
  // `useWebChat` returns a new object every render, which would otherwise loop through `onConnected`.
  const bridgeShell = useMemo(
    () => ({ isOpen, close, toggle, pageContext, onRefetchRef }),
    [isOpen, close, toggle, pageContext, onRefetchRef]
  );

  const value = useMemo<CopilotWebChatContextValue>(
    () => ({
      isAvailable: !!connected,
      isOpen,
      open,
      close,
      toggle,
      chat: connected?.chat,
      pageContext,
      sendMessage: connected?.sendMessage ?? (async () => false),
      retry: connected?.retry ?? (async () => {}),
      startNewConversation: connected?.startNewConversation ?? (() => {}),
      sentContextLabels: connected?.sentContextLabels ?? {},
      draft,
      setDraft,
      hasUnseenAnswer: !!connected?.hasUnseenAnswer && !isOpen,
      hasRunError: !!connected?.hasRunError,
      isBusy: !!connected?.isBusy,
    }),
    [connected, isOpen, open, close, toggle, pageContext, draft]
  );

  return (
    <CopilotRegisterContext.Provider value={registerPageContext}>
      <CopilotWebChatContext.Provider value={value}>
        {children}
        {enabled && (
          <CopilotConnectProvider>
            <CopilotWebChatBridge
              key={conversationScope}
              shell={bridgeShell}
              conversationScope={conversationScope}
              onConnected={setConnected}
            />
          </CopilotConnectProvider>
        )}
      </CopilotWebChatContext.Provider>
    </CopilotRegisterContext.Provider>
  );
}

const CopilotWebChatBridge = memo(function CopilotWebChatBridge({
  shell,
  conversationScope,
  onConnected,
}: {
  shell: BridgeShell;
  conversationScope?: string;
  onConnected: (state: ConnectedState | null) => void;
}) {
  const track = useTelemetry();
  const connectContext = useCopilotConnectContext();
  const { isOpen, close, toggle, pageContext, onRefetchRef } = shell;
  const [unseenAnswer, setUnseenAnswer] = useState(false);
  const [runError, setRunError] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [sentContextLabels, setSentContextLabels] = useState<Record<number, string>>({});
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

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
        track(TelemetryEvent.COPILOT_GENERATION_COMPLETED, { outcome: event.outcome, agentId: NOVU_COPILOT_AGENT_ID });
        if (event.outcome === 'completed' && !isOpenRef.current) setUnseenAnswer(true);
      } else if (event.type === 'run-error') {
        setAwaitingReply(false);
        track(TelemetryEvent.COPILOT_GENERATION_ERROR, { code: event.code, agentId: NOVU_COPILOT_AGENT_ID });
        setRunError(true);
      }
    },
    [track]
  );

  const onEvent = useCopilotRefetch(onRefetchRef, handleRunEvent);
  const [resumeConversationId, setResumeConversationId] = useState(() => readStoredConversationId(conversationScope));
  const chat = useWebChat({ agentId: NOVU_COPILOT_AGENT_ID, conversationId: resumeConversationId, onEvent });
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const isBusyRef = useRef(false);
  const resumeConversationIdRef = useRef(resumeConversationId);
  resumeConversationIdRef.current = resumeConversationId;

  useEffect(() => {
    if (chat.conversationId) writeStoredConversationId(conversationScope, chat.conversationId);
  }, [conversationScope, chat.conversationId]);

  // A stored conversation that fails to load opens a new chat. The stored id is kept, so a transient error
  // can't drop the thread; the next conversation's id overwrites it.
  const isResumeBroken = !!resumeConversationId && !!chat.error && !chat.isLoading && chat.messages.length === 0;
  useEffect(() => {
    if (isResumeBroken) setResumeConversationId(undefined);
  }, [isResumeBroken]);
  const pageContextRef = useRef(pageContext);
  pageContextRef.current = pageContext;
  const lastSentRef = useRef<{ text: string; metadata: ReturnType<typeof buildCopilotMetadata> } | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      // The client rejects sends during a run, so refuse up front and let the composer keep the text.
      if (!trimmed || chatRef.current.isLoading || isBusyRef.current) return false;

      const isNewChat = chatRef.current.messages.length === 0;
      track(TelemetryEvent.COPILOT_MESSAGE_SENT, {
        agentId: NOVU_COPILOT_AGENT_ID,
        isNewChat,
        messageLength: trimmed.length,
      });
      if (isNewChat) track(TelemetryEvent.COPILOT_CHAT_CREATED, { agentId: NOVU_COPILOT_AGENT_ID });

      setRunError(false);
      const metadata = buildCopilotMetadata(pageContextRef.current);
      const label = pageContextRef.current?.workflowLabel;
      const userMessageIndex = chatRef.current.messages.filter((message) => message.role === 'user').length;
      if (label) setSentContextLabels((labels) => ({ ...labels, [userMessageIndex]: label }));
      lastSentRef.current = { text: trimmed, metadata };
      setAwaitingReply(true);
      const { error } = await chatRef.current.sendMessage({ text: trimmed, metadata });
      if (error) setAwaitingReply(false);

      return true;
    },
    [track]
  );

  const retry = useCallback(async () => {
    if (chatRef.current.isLoading) return;

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

    const lastSent = lastSentRef.current;
    if (!lastSent) return;

    setRunError(false);
    setAwaitingReply(true);
    const { error } = await chatRef.current.sendMessage(lastSent);
    if (error) setAwaitingReply(false);
  }, []);

  const startNewConversation = useCallback(() => {
    lastSentRef.current = null;
    setSentContextLabels({});
    setRunError(false);
    setAwaitingReply(false);
    writeStoredConversationId(conversationScope, undefined);

    // `startNewConversation` is a no-op on a resumed conversation; dropping the id switches the hook to a new chat.
    if (resumeConversationIdRef.current) setResumeConversationId(undefined);
    else chatRef.current.startNewConversation();
  }, [conversationScope]);

  const isAvailable = !!connectContext;
  useCopilotHotkey({ isEnabled: isAvailable && !!pageContext?.workflowId, isOpen, toggle, close });

  // `chat.error` stays set while a failed send is retried, so failures are read from the run and the message instead.
  const hasRunError = runError || !!getFailedSend(chat.messages);
  const isBusy = !hasRunError && (chat.isRunning || (awaitingReply && hasPendingReplyGap(chat.messages)));
  isBusyRef.current = isBusy;

  useEffect(() => {
    if (!isAvailable) {
      onConnected(null);

      return;
    }

    onConnected({
      chat,
      sendMessage,
      retry,
      startNewConversation,
      hasUnseenAnswer: unseenAnswer,
      hasRunError,
      sentContextLabels,
      isBusy,
    });
  }, [
    isAvailable,
    chat,
    sendMessage,
    retry,
    startNewConversation,
    unseenAnswer,
    hasRunError,
    sentContextLabels,
    isBusy,
    onConnected,
  ]);

  useEffect(() => () => onConnected(null), [onConnected]);

  return null;
});
