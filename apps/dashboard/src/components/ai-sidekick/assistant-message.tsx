import { UIMessage } from 'ai';
import { useMemo } from 'react';
import { Message } from '../ai-elements/message';
import { ChatChainOfThought } from './chat-chain-of-thought';
import { ChatMessageActions } from './chat-message-actions';
import { StyledMessageResponse } from './chat-message-response';
import { hasKnownMessageParts } from './message-utils';

export const AssistantMessage = ({
  message,
  isGenerating,
  isReviewingChanges,
  isLastAssistantMessage,
  lastUserMessageId,
  isActionPending,
  onKeepAll,
  onDiscard,
  onTryAgain,
}: {
  message: UIMessage;
  isGenerating: boolean;
  isReviewingChanges?: boolean;
  isLastAssistantMessage?: boolean;
  lastUserMessageId?: string;
  isActionPending?: boolean;
  onKeepAll: () => void;
  onDiscard: (messageId: string) => void;
  onTryAgain: (messageId: string) => void;
}) => {
  const isAssistantMessageWithKnownParts = useMemo(() => hasKnownMessageParts(message), [message]);
  const hasDynamicToolParts = useMemo(
    () => message.parts.filter((p) => p.type.startsWith('dynamic-tool')).length > 0,
    [message]
  );
  const textParts = useMemo(() => {
    return (message.parts ?? [])
      .filter(
        (p) =>
          p.type === 'text' &&
          typeof (p as { text?: string }).text === 'string' &&
          !(p as { text: string }).text.startsWith('{')
      )
      .map((p) => (p as { text: string }).text);
  }, [message]);

  if (!isAssistantMessageWithKnownParts) {
    return null;
  }

  return (
    <Message from={message.role} key={message.id}>
      {hasDynamicToolParts && <ChatChainOfThought message={message} />}
      {textParts.map((text, i) => (
        <StyledMessageResponse key={`text-${message.id}-${i}`}>{text}</StyledMessageResponse>
      ))}
      {!isGenerating && isReviewingChanges && isLastAssistantMessage && lastUserMessageId && (
        <ChatMessageActions
          lastUserMessageId={lastUserMessageId}
          isActionPending={isActionPending}
          onKeepAll={onKeepAll}
          onDiscard={onDiscard}
          onTryAgain={onTryAgain}
        />
      )}
    </Message>
  );
};
