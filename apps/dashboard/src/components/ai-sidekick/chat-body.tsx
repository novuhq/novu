import { ChatStatus, UIMessage } from 'ai';
import { FC, FormEvent, SVGProps, useMemo } from 'react';
import { IconType } from 'react-icons';
import { Conversation, ConversationContent, ConversationScrollButton } from '../ai-elements/conversation';
import { Message } from '../ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../ai-elements/prompt-input';
import { Broom } from '../icons/broom';
import { BroomSparkle } from '../icons/broom-sparkle';
import { Badge, BadgeIcon } from '../primitives/badge';
import { Skeleton } from '../primitives/skeleton';
import { AssistantMessage } from './assistant-message';
import { hasKnownMessageParts } from './message-utils';
import { UserMessage } from './user-message';

const chatConversationContentClassName = 'gap-4 py-4 px-4';

export const ChatBodySkeleton = () => {
  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className={chatConversationContentClassName}>
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

const ChatBodyNoHistory = ({
  newChatSuggestions,
  isGenerating,
  onSuggestionClick,
}: {
  newChatSuggestions?: { label: string; icon: IconType | FC<SVGProps<SVGSVGElement>> }[];
  isGenerating: boolean;
  onSuggestionClick: (suggestion: string) => void;
}) => {
  return (
    <div className="flex flex-col justify-center items-start h-full p-5">
      <div className="flex flex-col gap-1 px-1 py-5">
        <div className="flex flex-col gap-3">
          <BroomSparkle className="size-5" />
          <span className="text-label-md font-normal bg-linear-to-b from-[hsla(0,0%,57%,1)] to-[hsla(0,0%,39%,1)] bg-clip-text text-transparent">
            Novu Copilot
          </span>
        </div>
        <span className="text-label-xs text-text-soft">
          Suggests improvements, fills gaps, and applies best practices as you build.{' '}
        </span>
      </div>
      <div className="flex flex-row gap-2 flex-wrap">
        {newChatSuggestions?.map((suggestion) => (
          <Badge
            key={suggestion.label}
            variant="stroke"
            color="gray"
            size="md"
            className="cursor-pointer px-2.5 py-1.5 text-label-xs h-auto ring-stroke-soft"
            disabled={isGenerating}
            onClick={() => onSuggestionClick(suggestion.label)}
          >
            <BadgeIcon as={suggestion.icon} className="size-4 fill-current" />
            {suggestion.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export const ChatBody = ({
  hasNoChatHistory,
  newChatSuggestions,
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
  onSuggestionClick,
}: {
  hasNoChatHistory: boolean;
  newChatSuggestions?: { label: string; icon: IconType | FC<SVGProps<SVGSVGElement>> }[];
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
  onSuggestionClick: (suggestion: string) => void;
}) => {
  const hasLastUserMessage = messages.length === 0 || messages[messages.length - 1].role === 'user';
  const lastMessage = messages[messages.length - 1];
  const isLastAssistantMessage = lastMessage?.role === 'assistant';
  const lastAssistantHasKnownToolCalls = useMemo(
    () => isLastAssistantMessage && hasKnownMessageParts(lastMessage),
    [lastMessage, isLastAssistantMessage]
  );
  const isGeneratingOrSubmitted =
    (isGenerating && hasLastUserMessage) || (isGenerating && isLastAssistantMessage && !lastAssistantHasKnownToolCalls);
  const isSubmitGuard = !inputText.trim() || isGenerating || isSubmitDisabled;
  const isSubmitButtonDisabled = (!inputText.trim() && !isGenerating) || isSubmitDisabled;

  const onSubmitHandler = (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isSubmitGuard) return;

    onSubmit(message.text);
  };

  return (
    <>
      <Conversation className="min-h-0 [&>div:first-child]:overflow-x-hidden">
        {hasNoChatHistory && messages.length === 0 ? (
          <ChatBodyNoHistory
            newChatSuggestions={newChatSuggestions}
            isGenerating={isGenerating}
            onSuggestionClick={onSuggestionClick}
          />
        ) : (
          <ConversationContent
            className={chatConversationContentClassName}
            scrollClassName="overflow-y-auto ![scrollbar-gutter:initial]"
          >
            {messages.map((chatMessage) => {
              const isLastAssistantMessage =
                chatMessage.role === 'assistant' && chatMessage.id === messages[messages.length - 1].id;

              if (chatMessage.role === 'user') {
                return (
                  <UserMessage
                    key={chatMessage.id}
                    message={chatMessage}
                    onRevert={onRevertMessage}
                    onTryAgain={onTryAgain}
                    isGenerating={isGenerating}
                    isActionPending={isActionPending}
                  />
                );
              }

              if (chatMessage.role === 'assistant') {
                return (
                  <AssistantMessage
                    key={chatMessage.id}
                    message={chatMessage}
                    isGenerating={isGenerating}
                    isReviewingChanges={isReviewingChanges}
                    isLastAssistantMessage={isLastAssistantMessage}
                    lastUserMessageId={lastUserMessageId}
                    isActionPending={isActionPending}
                    onKeepAll={onKeepAll}
                    onDiscard={onDiscard}
                    onTryAgain={onTryAgain}
                  />
                );
              }

              return null;
            })}
            {isGeneratingOrSubmitted && !errorMessage && (
              <Message from="assistant" className="flex flex-row items-center gap-1">
                <Broom className="size-3" />
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
        <PromptInput onSubmit={onSubmitHandler}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(event) => onInputChange(event.target.value)}
              value={inputText}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();

                  if (!isSubmitGuard) {
                    onSubmit(inputText);
                  }
                }
              }}
              placeholder="Ask for changes… eg: Make the workflow high severity.."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit disabled={isSubmitButtonDisabled} status={status} onStop={stop} className="ml-auto" />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
};
