import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getDocsAssistantMessageUrl } from '@/api/docs-assistant';
import { getToken } from '@/utils/auth';

const THREAD_ID_STORAGE_KEY = 'novu-docs-assistant-thread-id';
const THREAD_KEY_STORAGE_KEY = 'novu-docs-assistant-thread-key';

type UseMintlifyAssistantOptions = {
  enabled?: boolean;
};

function readStoredThread(): { threadId: string | null; threadKey: string | null } {
  return {
    threadId: localStorage.getItem(THREAD_ID_STORAGE_KEY),
    threadKey: localStorage.getItem(THREAD_KEY_STORAGE_KEY),
  };
}

function persistThreadHeaders(response: Response) {
  const threadId = response.headers.get('x-thread-id');
  const threadKey = response.headers.get('x-thread-key');

  if (threadId) {
    localStorage.setItem(THREAD_ID_STORAGE_KEY, threadId);
  }

  if (threadKey) {
    localStorage.setItem(THREAD_KEY_STORAGE_KEY, threadKey);
  }
}

export function useMintlifyAssistant({ enabled = true }: UseMintlifyAssistantOptions = {}) {
  const location = useLocation();
  const threadIdRef = useRef<string | null>(readStoredThread().threadId);
  const threadKeyRef = useRef<string | null>(readStoredThread().threadKey);
  const currentPathRef = useRef(location.pathname);

  currentPathRef.current = location.pathname;

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: getDocsAssistantMessageUrl(),
      headers: async () => {
        const token = await getToken();

        return {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
      },
      fetch: async (input, init) => {
        const response = await fetch(input, init);

        persistThreadHeaders(response);

        const threadId = response.headers.get('x-thread-id');
        const threadKey = response.headers.get('x-thread-key');

        if (threadId) {
          threadIdRef.current = threadId;
        }

        if (threadKey) {
          threadKeyRef.current = threadKey;
        }

        return response;
      },
      prepareSendMessagesRequest: (options) => {
        return {
          body: {
            fp: 'dashboard',
            retrievalPageSize: 5,
            currentPath: currentPathRef.current.slice(0, 200),
            threadId: threadIdRef.current ?? undefined,
            threadKey: threadKeyRef.current ?? undefined,
            messages: options.messages,
          },
        };
      },
    });
  }, []);

  const { messages, sendMessage, status, error, stop, setMessages } = useChat<UIMessage>({
    transport,
    experimental_throttle: 50,
  });

  const isGenerating = status === 'streaming' || status === 'submitted';
  const isReady = status === 'ready';

  const sendPrompt = useCallback(
    (prompt: string) => {
      if (!enabled || !prompt.trim()) {
        return;
      }

      return sendMessage({ text: prompt.trim() });
    },
    [enabled, sendMessage]
  );

  const resetConversation = useCallback(() => {
    threadIdRef.current = null;
    threadKeyRef.current = null;
    localStorage.removeItem(THREAD_ID_STORAGE_KEY);
    localStorage.removeItem(THREAD_KEY_STORAGE_KEY);
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    sendPrompt,
    status,
    error,
    stop,
    isGenerating,
    isReady,
    resetConversation,
  };
}
