import { AiWorkflowToolsEnum } from '@novu/shared';
import { ChatStatus, DataUIPart, DynamicToolUIPart, UIMessage } from 'ai';
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
import { Button } from '../primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { ChatChainOfThought } from './chat-chain-of-thought';
import { WhatsChangedSection } from './whats-changed-section';

function getToolPartsFromMessage(message: UIMessage): Array<DynamicToolUIPart> {
  const tools: Array<DynamicToolUIPart> = [];

  for (const part of message.parts) {
    if (part.type.startsWith('dynamic-tool')) {
      tools.push(part as DynamicToolUIPart);
    }
  }

  return tools;
}

function getToolCallIdFromReasoningPart(
  part: DataUIPart<{ reasoning: { toolCallId: string; text: string } }>
): string | undefined {
  const data = part.data as { toolCallId?: string; reasoning?: { toolCallId: string } };
  return data.toolCallId ?? data.reasoning?.toolCallId;
}

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
          <Shimmer className="text-label-xs">Loading...</Shimmer>
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
  inputText,
  onInputChange,
  isGenerating,
  status,
  stop,
  onSubmit,
  messages,
  dataParts,
  isSubmitDisabled,
  isReviewingChanges,
  isActionPending,
  lastUserMessageId,
  onKeepAll,
  onDiscard,
  onTryAgain,
  onRevertMessage,
}: {
  inputText: string;
  onInputChange: (text: string) => void;
  isGenerating: boolean;
  status: ChatStatus;
  stop: () => void;
  onSubmit: (message: string) => void;
  messages: UIMessage[];
  dataParts: Array<DataUIPart<{ reasoning: { toolCallId: string; text: string } }>>;
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
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4 py-4 px-4 -ml-4 -mr-3.5">
          {messages.map((chatMessage) => {
            const { text } = extractMessageContent(chatMessage);
            const messageToolParts = getToolPartsFromMessage(chatMessage);
            const allToolParts = messageToolParts.filter((t) => t.toolName !== AiWorkflowToolsEnum.COMPLETE_WORKFLOW);
            const completedToolPart = messageToolParts.find(
              (t) => t.toolName === AiWorkflowToolsEnum.COMPLETE_WORKFLOW
            );
            const toolCallIds = new Set(messageToolParts.map((t) => t.toolCallId));
            const toolReasoningParts = dataParts.filter((p) => {
              if (p.type !== 'data-reasoning') return false;
              const partToolCallId = getToolCallIdFromReasoningPart(p);
              return partToolCallId != null && toolCallIds.has(partToolCallId);
            });

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
                    {(isGenerating || allToolParts.length > 0) && (
                      <ChatChainOfThought
                        toolParts={allToolParts}
                        toolReasoningParts={toolReasoningParts}
                        isStreaming={isGenerating}
                      />
                    )}
                    {completedToolPart && lastUserMessageId && (
                      <WhatsChangedSection
                        lastUserMessageId={lastUserMessageId}
                        completedToolPart={completedToolPart}
                        isReviewingChanges={isReviewingChanges}
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
          {status === 'submitted' && <Shimmer className="text-label-xs">Thinking...</Shimmer>}
        </ConversationContent>
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
