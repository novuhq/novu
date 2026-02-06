import { AiWorkflowToolsEnum } from '@novu/shared';
import { ChatStatus, DataUIPart, DynamicToolUIPart, UIMessage } from 'ai';
import { Conversation, ConversationContent, ConversationScrollButton } from '../ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '../ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '../ai-elements/prompt-input';
import { Shimmer } from '../ai-elements/shimmer';
import { ChatChainOfThought } from './chat-chain-of-thought';
import { WhatsChangedSection } from './whats-changed-section';

function parseToolParts(messages: UIMessage[], includeAll = false): Array<DynamicToolUIPart> {
  const tools: Array<DynamicToolUIPart> = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts) {
      if (part.type.startsWith('dynamic-tool')) {
        const toolPart = part as DynamicToolUIPart;
        if (includeAll || toolPart.state === 'output-available') {
          tools.push(toolPart);
        }
      }
    }
  }

  return tools;
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
  onSubmit,
  messages,
  dataParts,
  isSubmitDisabled,
}: {
  inputText: string;
  onInputChange: (text: string) => void;
  isGenerating: boolean;
  status: ChatStatus;
  onSubmit: (message: string) => void;
  messages: UIMessage[];
  dataParts: Array<DataUIPart<{ reasoning: { toolCallId: string; text: string } }>>;
  isSubmitDisabled: boolean;
}) => {
  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4 py-4 px-4 -ml-4 -mr-3.5">
          {messages.map((chatMessage) => {
            const { text } = extractMessageContent(chatMessage);
            const toolReasoningParts = dataParts.filter((p) => p.type === 'data-reasoning');
            const allToolParts = parseToolParts(messages, true).filter(
              (t) => t.toolName !== AiWorkflowToolsEnum.COMPLETE_WORKFLOW
            );
            const completedToolPart = parseToolParts(messages, true).find(
              (t) => t.toolName === AiWorkflowToolsEnum.COMPLETE_WORKFLOW
            );

            return (
              <Message from={chatMessage.role} key={chatMessage.id}>
                {chatMessage.role === 'user' && text && (
                  <MessageContent>
                    <MessageResponse>{text}</MessageResponse>
                  </MessageContent>
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
                    {completedToolPart && <WhatsChangedSection completedToolPart={completedToolPart} />}
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
