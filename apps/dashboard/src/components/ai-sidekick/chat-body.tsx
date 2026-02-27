import { ChatStatus, UIMessage } from 'ai';
import { RiArrowGoBackLine, RiRefreshLine } from 'react-icons/ri';
import { Conversation, ConversationContent, ConversationScrollButton } from '../ai-elements/conversation';
import { Message } from '../ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../ai-elements/prompt-input';
import { Shimmer } from '../ai-elements/shimmer';
import { BroomSparkle } from '../icons/broom-sparkle';
import { Button } from '../primitives/button';
import { Skeleton } from '../primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { ChatChainOfThoughtReasoning, ChatChainOfThoughtToolCalls } from './chat-chain-of-thought';
import { ChatMessageActions } from './chat-message-actions';
import { StyledMessageResponse } from './chat-message-response';

function extractMessageContent(message: UIMessage): { text: string } {
  let text = '';

  for (const part of message.parts) {
    if (part.type === 'text' && part.text) {
      text += part.text;
    }
  }

  return { text };
}

export const ChatBodySkeleton = () => {
  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4 py-4 px-4 -ml-4 -mr-3.5">
          <div className="group flex w-full flex-col gap-2 is-user ml-auto justify-end">
            <div className="flex justify-end gap-1 -mb-1">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="w-5 h-5" />
            </div>
            <Skeleton className="w-40 h-8 self-end" />
          </div>
          <div className="group flex w-full flex-col gap-4 is-user ml-auto justify-end">
            <Skeleton className="w-full h-5 " />
            <Skeleton className="w-full h-20 " />
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 p-3">
        <PromptInput onSubmit={() => {}}>
          <PromptInputBody>
            <PromptInputTextarea
              disabled
              value=""
              placeholder="Ask for changes… eg: Make the workflow high severity.."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit disabled className="ml-auto" />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
};

export const ChatBody = ({
  hasNoChatHistory,
  inputText,
  onInputChange,
  isGenerating,
  status,
  errorMessage,
  stop,
  onSubmit,
  messages,
  isSubmitDisabled,
  isReviewingChanges,
  isActionPending,
  lastUserMessageId,
  onKeepAll,
  onDiscard,
  onTryAgain,
  onRevertMessage,
}: {
  hasNoChatHistory: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  isGenerating: boolean;
  status: ChatStatus;
  errorMessage?: string | null;
  stop: () => void;
  onSubmit: (message: string) => void;
  messages: UIMessage[];
  isSubmitDisabled: boolean;
  isReviewingChanges?: boolean;
  isActionPending?: boolean;
  lastUserMessageId?: string;
  onKeepAll: () => void;
  onDiscard: (messageId: string) => void;
  onTryAgain: (messageId: string) => void;
  onRevertMessage: (messageId: string) => void;
}) => {
  return (
    <>
      <Conversation className="min-h-0 [&>div:first-child]:overflow-x-hidden">
        {hasNoChatHistory && messages.length === 0 ? (
          <div className="flex justify-start items-center h-full p-5">
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-3">
                <BroomSparkle className="size-5" />
                <span className="text-label-md font-normal bg-linear-to-b from-[hsla(0,0%,57%,1)] to-[hsla(0,0%,39%,1)] bg-clip-text text-transparent">
                  Novu Sidekick
                </span>
              </div>
              <span className="text-label-xs text-text-soft">
                Suggests improvements, fills gaps, and applies best practices as you build.{' '}
              </span>
            </div>
          </div>
        ) : (
          <ConversationContent className="gap-4 py-4 px-4 -ml-4 -mr-3.5">
            {messages.map((chatMessage) => {
              const { text } = extractMessageContent(chatMessage);
              const hasReasoningContent = (chatMessage.parts ?? []).some((p) => p.type === 'reasoning');
              const hasToolCallsContent = (chatMessage.parts ?? []).some((p) => p.type?.startsWith('dynamic-tool'));
              const textParts = (chatMessage.parts ?? [])
                .filter(
                  (p) =>
                    p.type === 'text' &&
                    typeof (p as { text?: string }).text === 'string' &&
                    !(p as { text: string }).text.startsWith('{')
                )
                .map((p) => (p as { text: string }).text);
              const isLastMessage = chatMessage.id === messages[messages.length - 1].id;
              const isLastAssistantMessage =
                chatMessage.role === 'assistant' && chatMessage.id === messages[messages.length - 1].id;

              return (
                <Message from={chatMessage.role} key={chatMessage.id}>
                  {chatMessage.role === 'user' && (
                    <div className="flex justify-end gap-1 -mb-1">
                      <Tooltip delayDuration={2000}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            mode="ghost"
                            size="2xs"
                            className="p-1 h-auto hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent [&>svg]:size-3"
                            onClick={() => onRevertMessage(chatMessage.id)}
                            disabled={isGenerating || isActionPending}
                            trailingIcon={RiArrowGoBackLine}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Revert</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={2000}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            mode="ghost"
                            size="2xs"
                            className="p-1 h-auto hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent [&>svg]:size-3"
                            onClick={() => onTryAgain(chatMessage.id)}
                            disabled={isGenerating || isActionPending}
                            trailingIcon={RiRefreshLine}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Try again</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {chatMessage.role === 'user' && text && (
                    <div className="flex justify-end bg-[#F1F1F1] rounded-lg p-2 max-w-full self-end">
                      <span className="text-label-xs text-text-sub">{text}</span>
                    </div>
                  )}
                  {chatMessage.role === 'assistant' && (
                    <>
                      {(isGenerating || hasReasoningContent) && (
                        <ChatChainOfThoughtReasoning
                          defaultIsExpanded={isGenerating && isLastMessage}
                          message={chatMessage}
                          isStreaming={isGenerating && isLastMessage}
                        />
                      )}
                      {(isGenerating || hasToolCallsContent) && (
                        <ChatChainOfThoughtToolCalls
                          defaultIsExpanded={isGenerating && isLastMessage}
                          message={chatMessage}
                          isStreaming={isGenerating && isLastMessage}
                        />
                      )}
                      {textParts.map((text, i) => (
                        <StyledMessageResponse key={`text-${chatMessage.id}-${i}`}>{text}</StyledMessageResponse>
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
                    </>
                  )}
                </Message>
              );
            })}
            {status === 'submitted' && !errorMessage && (
              <Message from="assistant">
                <Shimmer className="text-label-xs">Thinking...</Shimmer>
              </Message>
            )}
            {errorMessage && (
              <Message from="assistant">
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 flex">
                  <span className="text-label-xs text-red-700">Error: {errorMessage}</span>
                </div>
              </Message>
            )}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 p-3">
        <PromptInput onSubmit={(message) => onSubmit(message.text)}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(event) => onInputChange(event.target.value)}
              value={inputText}
              placeholder="Ask for changes… eg: Make the workflow high severity.."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit
              disabled={!inputText.trim() || isGenerating || isSubmitDisabled}
              status={status}
              onStop={stop}
              className="ml-auto"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
};
