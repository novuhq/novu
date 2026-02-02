import { UIMessage, useChat } from '@ai-sdk/react';
import { AiResourceTypeEnum } from '@novu/shared';
import { ChatOnDataCallback, ChatOnToolCallCallback, DataUIPart, DefaultChatTransport, UIDataTypes, UITools } from 'ai';
import { useCallback, useEffect, useMemo } from 'react';
import { getChatSteamUrl, getChatStreamResumeUrl } from '@/api/ai';
import { useEnvironment } from '@/context/environment/hooks';
import { getToken } from '@/utils/auth';
import { useDataRef } from './use-data-ref';

export type ToolInvocationPart = {
  type: 'tool-invocation';
  toolInvocation: {
    toolName: string;
    args: Record<string, unknown>;
    state: 'call' | 'result';
    result?: unknown;
  };
};

type UseAiChatOptions<D extends UIDataTypes = UIDataTypes, T extends UITools = UITools> = {
  id?: string;
  resume?: boolean;
  resourceType: AiResourceTypeEnum;
  initialMessages?: UIMessage<unknown, D, T>[];
  onData?: ChatOnDataCallback<UIMessage>;
  onToolCall?: ChatOnToolCallCallback<UIMessage>;
  onFinish?: () => void;
  onError?: (error: Error) => void;
};

export function useAiChat<D extends UIDataTypes = UIDataTypes, T extends UITools = UITools>({
  id,
  resume,
  resourceType,
  initialMessages = [],
  onData,
  onToolCall,
  onFinish,
  onError,
}: UseAiChatOptions<D, T>) {
  const { currentEnvironment } = useEnvironment();
  const environmentIdRef = useDataRef(currentEnvironment?._id);
  const resourceTypeRef = useDataRef(resourceType);

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: getChatSteamUrl(),
      headers: async () => {
        const token = await getToken();

        return {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(environmentIdRef.current && { 'Novu-Environment-Id': environmentIdRef.current }),
        };
      },
      prepareReconnectToStreamRequest: ({ id }) => {
        return {
          api: getChatStreamResumeUrl(id),
        };
      },
      prepareSendMessagesRequest: (options) => {
        return {
          body: {
            id: options.id,
            message: options.messages[options.messages.length - 1],
            resourceType: resourceTypeRef.current,
            ...options.body,
          },
        };
      },
    });
  }, [environmentIdRef, resourceTypeRef]);

  const { messages, sendMessage, status, error, stop, setMessages } = useChat<UIMessage<unknown, D, T>>({
    id,
    resume,
    transport,
    messages: initialMessages ?? [],
    // Throttle the messages and data updates to 50ms:
    experimental_throttle: 50,
    onFinish,
    onData,
    onToolCall,
    onError,
  });
  const isGenerating = status === 'streaming' || status === 'submitted';
  const generatingRef = useDataRef(status);

  useEffect(() => {
    return () => {
      if (generatingRef.current) {
        stop();
      }
    };
  }, [generatingRef, stop]);

  const sendPrompt = useCallback(
    ({ chatId, prompt }: { chatId: string; prompt: string }) =>
      sendMessage({ text: prompt }, { body: { id: chatId, resourceType } }),
    [sendMessage, resourceType]
  );

  const isReady = status === 'ready';

  const reasoningParts = useMemo(() => {
    return messages.filter((m) => m.role === 'assistant').flatMap((m) => m.parts.filter((p) => p.type === 'reasoning'));
  }, [messages]);

  const textParts = useMemo(() => {
    return messages.filter((m) => m.role === 'assistant').flatMap((m) => m.parts.filter((p) => p.type === 'text'));
  }, [messages]);

  const dataParts: DataUIPart<D>[] = useMemo(() => {
    return messages
      .filter((m) => m.role === 'assistant')
      .flatMap((m) => m.parts.filter((p) => p.type.startsWith('data-'))) as DataUIPart<D>[];
  }, [messages]);

  const toolParts = useMemo((): ToolInvocationPart[] => {
    const parts: ToolInvocationPart[] = [];
    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      for (const part of message.parts) {
        if (part.type.startsWith('tool-') && 'toolInvocation' in part) {
          parts.push(part as unknown as ToolInvocationPart);
        }
      }
    }

    return parts;
  }, [messages]);

  return {
    id,
    messages,
    sendPrompt,
    status,
    error,
    stop,
    setMessages,
    isGenerating,
    isReady,
    reasoningParts,
    textParts,
    toolParts,
    dataParts,
  };
}
