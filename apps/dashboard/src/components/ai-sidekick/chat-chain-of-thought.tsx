import { AiWorkflowToolsEnum } from '@novu/shared';
import { DataUIPart, DynamicToolUIPart, ToolUIPart } from 'ai';
import { useEffect, useRef, useState } from 'react';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '../ai-elements/chain-of-thought';
import { Shimmer } from '../ai-elements/shimmer';
import { StyledMessageResponse } from './chat-message-response';

type StepInput = {
  name: string;
  stepId: string;
};

type CompleteWorkflowOutput = {
  summary: string;
};

const TOOL_DISPLAY_CONFIG: Record<
  string,
  { label: string; getDescription?: (input: ToolUIPart['input'], output: ToolUIPart['output']) => string }
> = {
  [AiWorkflowToolsEnum.RETRIEVE_ORGANIZATION_META]: {
    label: 'Checking organization metadata',
    getDescription: () => 'Organization metadata has been retrieved.',
  },
  [AiWorkflowToolsEnum.SET_WORKFLOW_METADATA]: {
    label: 'Generated workflow metadata',
    getDescription: () => 'Workflow tags, descriptions and other metadata has been added based on the workflow.',
  },
  [AiWorkflowToolsEnum.ADD_EMAIL_STEP]: {
    label: 'Channel steps modified',
    getDescription: (input) => `Email: ${(input as StepInput).name || 'Email step'}`,
  },
  [AiWorkflowToolsEnum.ADD_IN_APP_STEP]: {
    label: 'Channel steps modified',
    getDescription: (input) => `In-App: ${(input as StepInput).name || 'In-app step'}`,
  },
  [AiWorkflowToolsEnum.ADD_SMS_STEP]: {
    label: 'Channel steps modified',
    getDescription: (input) => `SMS: ${(input as StepInput).name || 'SMS step'}`,
  },
  [AiWorkflowToolsEnum.ADD_PUSH_STEP]: {
    label: 'Channel steps modified',
    getDescription: (input) => `Push: ${(input as StepInput).name || 'Push step'}`,
  },
  [AiWorkflowToolsEnum.ADD_CHAT_STEP]: {
    label: 'Channel steps modified',
    getDescription: (input) => `Chat: ${(input as StepInput).name || 'Chat step'}`,
  },
  [AiWorkflowToolsEnum.ADD_DIGEST_STEP]: {
    label: 'Digest',
    getDescription: (input) => `${(input as StepInput).name || 'Digest step'}`,
  },
  [AiWorkflowToolsEnum.ADD_DELAY_STEP]: {
    label: 'Delay',
    getDescription: (input) => `${(input as StepInput).name || 'Delay step'}`,
  },
  [AiWorkflowToolsEnum.ADD_THROTTLE_STEP]: {
    label: 'Throttle',
    getDescription: (input) => `${(input as StepInput).name || 'Throttle step'}`,
  },
  [AiWorkflowToolsEnum.COMPLETE_WORKFLOW]: {
    label: 'Workflow completed',
    getDescription: (_, output) => (output as CompleteWorkflowOutput).summary || 'Workflow generation completed.',
  },
};

function getToolStatus(state?: string): 'complete' | 'active' | 'pending' {
  if (state === 'output-available') return 'complete';
  if (state === 'streaming' || state === 'partial-call') return 'active';

  return 'pending';
}

type ChatChainOfThoughtProps = {
  toolParts: DynamicToolUIPart[];
  toolReasoningParts: DataUIPart<{ reasoning: { toolCallId: string; text: string } }>[];
  isStreaming: boolean;
};

export function ChatChainOfThought({ toolParts, toolReasoningParts, isStreaming }: ChatChainOfThoughtProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [thinkingDuration, setThinkingDuration] = useState<number | null>(null);
  const wasStreamingRef = useRef(isStreaming);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      startTimeRef.current = Date.now();
      setThinkingDuration(null);
    }

    if (wasStreamingRef.current && !isStreaming) {
      setIsOpen(false);
      if (startTimeRef.current) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        setThinkingDuration(duration);
      }
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  if (toolParts.length === 0 && !isStreaming && !thinkingDuration) {
    return null;
  }

  const headerText = isStreaming
    ? 'Drafting the workflow'
    : thinkingDuration !== null
      ? `Thought for ${thinkingDuration}s`
      : 'Drafted the workflow';

  return (
    <ChainOfThought open={isOpen} onOpenChange={setIsOpen}>
      <ChainOfThoughtHeader>{isStreaming ? <Shimmer>{headerText}</Shimmer> : headerText}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {toolParts.map((tool, index) => {
          const toolName = tool.toolName;
          const status = getToolStatus(tool.state);
          const toolReasoning = toolReasoningParts.filter((p) => p.data.toolCallId === tool.toolCallId);

          return (
            <ChainOfThoughtStep
              key={tool.toolCallId || `${tool.type}-${index}`}
              label={
                <Shimmer className="text-label-xs text-text-sub">
                  {TOOL_DISPLAY_CONFIG[toolName]?.label ?? toolName}
                </Shimmer>
              }
              status={status}
            >
              {toolReasoning.length > 0 && (
                <StyledMessageResponse>{toolReasoning.map((p) => p.data.text).join('\n')}</StyledMessageResponse>
              )}
            </ChainOfThoughtStep>
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
