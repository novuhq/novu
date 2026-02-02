import { AiResourceTypeEnum, AiWorkflowToolsNameEnum } from '@novu/shared';
import { ToolUIPart, UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useAiChat } from '@/hooks/use-ai-chat';
import { buildRoute, ROUTES } from '@/utils/routes';
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
import { useWorkflow } from '../workflow-editor/workflow-provider';
import { ChatChainOfThought } from './chat-chain-of-thought';
import { ChatMessage } from './types';
import { WhatsChangedSection } from './whats-changed-section';

function parseToolParts(messages: UIMessage[], includeAll = false): ToolUIPart[] {
  const tools: ToolUIPart[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts) {
      if (part.type.startsWith('tool-')) {
        const toolPart = part as ToolUIPart;
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
  chatId,
  resume,
  prompt,
  initialMessages,
}: {
  chatId: string;
  resume: boolean;
  prompt?: string;
  initialMessages: ChatMessage[];
}) => {
  const [inputText, setInputText] = useState('');
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const { refetch } = useWorkflow();
  const isMountedRef = useRef(false);

  const { sendPrompt, stop, status, isGenerating, messages, dataParts } = useAiChat<{
    'tool-reasoning': { toolCallId: string; text: string };
  }>({
    id: chatId,
    resume,
    initialMessages,
    resourceType: AiResourceTypeEnum.WORKFLOW,
    onData: (data) => {
      if (isMountedRef.current && data.type === 'data-workflow-created') {
        const workflowSlug = data.data as string;
        navigate(
          buildRoute(ROUTES.EDIT_WORKFLOW, {
            environmentSlug: currentEnvironment?.slug ?? '',
            workflowSlug,
          }),
          { replace: true, state: { chatId, prompt } }
        );
      } else if (isMountedRef.current && (data.type === 'data-step-added' || data.type === 'data-workflow-completed')) {
        refetch({ cancelRefetch: true });
      }
    },
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSendMessage = (message: string) => {
    if (chatId && message.trim()) {
      sendPrompt({ chatId, prompt: message });
      setInputText('');
    }
  };

  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4 py-4 px-4 -ml-4 -mr-3.5">
          {messages.map((chatMessage) => {
            const { text } = extractMessageContent(chatMessage);
            const toolReasoningParts = dataParts.filter((p) => p.type === 'data-tool-reasoning');
            const allToolParts = parseToolParts(messages, true).filter(
              (t) => t.type !== AiWorkflowToolsNameEnum.COMPLETE_WORKFLOW
            );
            const completedToolPart = parseToolParts(messages, true).find(
              (t) => t.type === AiWorkflowToolsNameEnum.COMPLETE_WORKFLOW
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
        <PromptInput onSubmit={(message) => handleSendMessage(message.text)}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(event) => setInputText(event.target.value)}
              value={inputText}
              placeholder="Ask for changes… eg: Make the workflow high severity.."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit
              disabled={!inputText.trim() || isGenerating}
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
