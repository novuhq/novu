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
import { buildCopilotMetadata, type CopilotPageContext } from './copilot-web-chat-utils';
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
  'chat' | 'sendMessage' | 'retry' | 'startNewConversation' | 'hasUnseenAnswer' | 'hasRunError'
>;

/**
 * Hosts one Copilot conversation for the whole workflow editor so it survives canvas and step
 * editor navigation. The web-chat connection lives in a sibling bridge (rendered once Novu's
 * tenant context is minted, never on self-hosted) so children are never remounted when it
 * becomes ready; until then the context reports `isAvailable: false` ("Copilot is off").
 */
export function CopilotWebChatProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
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
      sendMessage: connected?.sendMessage ?? (async () => {}),
      retry: connected?.retry ?? (async () => {}),
      startNewConversation: connected?.startNewConversation ?? (() => {}),
      draft,
      setDraft,
      hasUnseenAnswer: !!connected?.hasUnseenAnswer && !isOpen,
      hasRunError: !!connected?.hasRunError,
    }),
    [connected, isOpen, open, close, toggle, pageContext, draft]
  );

  return (
    <CopilotRegisterContext.Provider value={registerPageContext}>
      <CopilotWebChatContext.Provider value={value}>
        {children}
        {enabled && (
          <CopilotConnectProvider>
            <CopilotWebChatBridge shell={bridgeShell} onConnected={setConnected} />
          </CopilotConnectProvider>
        )}
      </CopilotWebChatContext.Provider>
    </CopilotRegisterContext.Provider>
  );
}

const CopilotWebChatBridge = memo(function CopilotWebChatBridge({
  shell,
  onConnected,
}: {
  shell: BridgeShell;
  onConnected: (state: ConnectedState | null) => void;
}) {
  const track = useTelemetry();
  const connectContext = useCopilotConnectContext();
  const { isOpen, close, toggle, pageContext, onRefetchRef } = shell;
  const [unseenAnswer, setUnseenAnswer] = useState(false);
  const [runError, setRunError] = useState(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (isOpen) setUnseenAnswer(false);
  }, [isOpen]);

  const handleRunEvent = useCallback(
    (envelope: AgentEventEnvelope) => {
      const { event } = envelope;

      if (event.type === 'run-start') {
        setRunError(false);
      } else if (event.type === 'run-finish') {
        track(TelemetryEvent.COPILOT_GENERATION_COMPLETED, { outcome: event.outcome, agentId: NOVU_COPILOT_AGENT_ID });
        if (event.outcome === 'completed' && !isOpenRef.current) setUnseenAnswer(true);
      } else if (event.type === 'run-error') {
        track(TelemetryEvent.COPILOT_GENERATION_ERROR, { code: event.code, agentId: NOVU_COPILOT_AGENT_ID });
        setRunError(true);
      }
    },
    [track]
  );

  const onEvent = useCopilotRefetch(onRefetchRef, handleRunEvent);
  const chat = useWebChat({ agentId: NOVU_COPILOT_AGENT_ID, onEvent });
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const pageContextRef = useRef(pageContext);
  pageContextRef.current = pageContext;
  const lastSentRef = useRef<{ text: string; metadata: ReturnType<typeof buildCopilotMetadata> } | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatRef.current.isLoading) return;

      const isNewChat = chatRef.current.messages.length === 0;
      track(TelemetryEvent.COPILOT_MESSAGE_SENT, {
        agentId: NOVU_COPILOT_AGENT_ID,
        isNewChat,
        messageLength: trimmed.length,
      });
      if (isNewChat) track(TelemetryEvent.COPILOT_CHAT_CREATED, { agentId: NOVU_COPILOT_AGENT_ID });

      setRunError(false);
      const metadata = buildCopilotMetadata(pageContextRef.current);
      lastSentRef.current = { text: trimmed, metadata };
      await chatRef.current.sendMessage({ text: trimmed, metadata });
    },
    [track]
  );

  const retry = useCallback(async () => {
    const lastSent = lastSentRef.current;
    if (!lastSent || chatRef.current.isLoading) return;

    setRunError(false);
    await chatRef.current.sendMessage(lastSent);
  }, []);

  const startNewConversation = useCallback(() => {
    lastSentRef.current = null;
    setRunError(false);
    chatRef.current.startNewConversation();
  }, []);

  const isAvailable = !!connectContext;
  useCopilotHotkey({ isEnabled: isAvailable, isOpen, toggle, close });

  const hasRunError = runError || !!chat.error;

  useEffect(() => {
    if (!isAvailable) {
      onConnected(null);

      return;
    }

    onConnected({ chat, sendMessage, retry, startNewConversation, hasUnseenAnswer: unseenAnswer, hasRunError });
  }, [isAvailable, chat, sendMessage, retry, startNewConversation, unseenAnswer, hasRunError, onConnected]);

  useEffect(() => () => onConnected(null), [onConnected]);

  return null;
});
