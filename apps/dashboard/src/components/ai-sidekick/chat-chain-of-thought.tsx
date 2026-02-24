import { AiWorkflowToolsEnum } from '@novu/shared';
import { DynamicToolUIPart, UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { cn } from '@/utils/ui';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '../ai-elements/chain-of-thought';
import { Shimmer } from '../ai-elements/shimmer';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/collapsible';
import { Tag } from '../primitives/tag';
import { StyledMessageResponse } from './chat-message-response';

type MessagePart = UIMessage['parts'][number];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function getAddStepParts(parts: MessagePart[]): DynamicToolUIPart[] {
  return parts.filter(
    (p) => p.type.startsWith('dynamic-tool') && (p as DynamicToolUIPart).toolName === AiWorkflowToolsEnum.ADD_STEP
  ) as DynamicToolUIPart[];
}

type WorkflowMetadataOutput = {
  name: string;
  description?: string;
  tags?: string[];
  severity?: string;
  critical?: boolean;
};

function MetadataRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5 py-0.5 pl-1 pr-1.5">
      <span className="font-mono text-label-xs font-medium text-text-sub">{term}</span>
      <div className="flex items-center gap-1 overflow-hidden">{children}</div>
    </div>
  );
}

function WorkflowInitializedSection({ output }: { output: WorkflowMetadataOutput }) {
  const workflowId = slugify(output.name);

  return (
    <ChainOfThoughtStep
      label={<span className="text-label-xs font-medium text-text-sub">Workflow initialized</span>}
      status="complete"
      collapsible
      defaultOpen={true}
    >
      <div className="flex flex-col gap-1.5 rounded-lg p-2">
        <MetadataRow term="Workflow">
          <span className="font-mono text-code-xs text-text-soft truncate" title={output.name}>
            {output.name}
          </span>
        </MetadataRow>
        <MetadataRow term="ID">
          <span className="font-mono text-code-xs text-text-soft truncate" title={workflowId}>
            {workflowId}
          </span>
        </MetadataRow>
        {output.description && (
          <Collapsible defaultOpen={false} className="group">
            <div className="flex flex-col gap-1 py-0.5 pl-1 pr-1.5">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-5 text-left transition-opacity hover:opacity-80">
                <span className="font-mono text-label-xs font-medium text-text-sub">Description</span>
                <RiExpandUpDownLine
                  className="size-4 shrink-0 text-text-sub transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <span className="font-mono text-code-xs text-text-soft text-left">{output.description}</span>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        {output.severity && (
          <MetadataRow term="Severity">
            <span className="font-mono text-code-xs text-text-soft capitalize">{output.severity}</span>
          </MetadataRow>
        )}
        {output.critical != null && (
          <MetadataRow term="Critical">
            <span className="font-mono text-code-xs text-text-soft">{output.critical ? 'ON' : 'OFF'}</span>
          </MetadataRow>
        )}
        {output.tags && output.tags.length > 0 && (
          <Collapsible defaultOpen={false} className="group">
            <div className="flex flex-col gap-1 py-0.5 pl-1 pr-1.5">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-5 text-left transition-opacity hover:opacity-80">
                <span className="font-mono text-label-xs font-medium text-text-sub">Tags</span>
                <RiExpandUpDownLine
                  className="size-4 shrink-0 text-text-sub transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="flex flex-wrap items-center gap-2">
                  {output.tags.map((tag) => (
                    <Tag key={tag} variant="stroke">
                      {tag}
                    </Tag>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>
    </ChainOfThoughtStep>
  );
}

function WorkflowStepItem({ output }: { output: { stepId: string; name: string; type: string } }) {
  const stepType = output.type as StepTypeEnum;
  const Icon = STEP_TYPE_TO_ICON[stepType] ?? STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];
  const color = STEP_TYPE_TO_COLOR[stepType] ?? STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#E1E4EA] bg-white px-2 py-1">
      <div
        className="flex size-5 items-center justify-center border opacity-40 rounded-full"
        style={{ borderColor: `hsl(var(--${color}))`, color: `hsl(var(--${color}))` }}
      >
        <Icon className="size-3" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-label-xs text-foreground">{output.name}</span>
        <span className="block truncate text-label-2xs text-text-sub">{output.stepId}</span>
      </div>
    </div>
  );
}

function BuildingWorkflowStructureSection({
  addStepParts,
  isStreaming,
}: {
  addStepParts: DynamicToolUIPart[];
  isStreaming: boolean;
}) {
  const stepsWithOutput = addStepParts.filter((p) => p.state === 'output-available' && p.output);

  if (stepsWithOutput.length === 0) return null;

  return (
    <ChainOfThoughtStep
      label={
        <span className={cn('flex items-center justify-between gap-1')}>
          {isStreaming ? (
            <Shimmer className={cn('text-label-xs font-medium')}>Building the workflow structure</Shimmer>
          ) : (
            <span className="text-label-xs font-medium text-text-sub">Built the workflow structure</span>
          )}
          <span className="text-label-xs text-text-sub pr-2">
            {stepsWithOutput.length} {stepsWithOutput.length === 1 ? 'STEP' : 'STEPS'}
          </span>
        </span>
      }
      status="complete"
      collapsible
      defaultOpen={true}
    >
      <div className="flex flex-col gap-2 p-2 pl-0">
        {stepsWithOutput.map((part, index) => (
          <WorkflowStepItem
            key={part.toolCallId ?? index}
            output={part.output as { stepId: string; name: string; type: string }}
          />
        ))}
      </div>
    </ChainOfThoughtStep>
  );
}

type ChatChainOfThoughtProps = {
  defaultIsExpanded?: boolean;
  message: UIMessage;
  isStreaming: boolean;
};

export function ChatChainOfThought({ defaultIsExpanded, message, isStreaming }: ChatChainOfThoughtProps) {
  const [isExpanded, setIsExpanded] = useState(defaultIsExpanded ?? false);
  const [thinkingDuration, setThinkingDuration] = useState<number | null>(null);
  const wasStreamingRef = useRef(isStreaming);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      startTimeRef.current = Date.now();
      setThinkingDuration(null);
    }

    if (wasStreamingRef.current && !isStreaming) {
      setIsExpanded(false);
      if (startTimeRef.current) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        setThinkingDuration(duration);
      }
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const parts = message.parts ?? [];
  const addStepParts = getAddStepParts(parts);

  const renderItems: Array<
    | { type: 'text'; text: string; state?: 'streaming' | 'done' }
    | { type: 'reasoning'; text: string; state?: 'streaming' | 'done' }
    | { type: 'workflowInit'; output: WorkflowMetadataOutput }
    | { type: 'buildWorkflow'; steps: DynamicToolUIPart[] }
  > = [];

  let workflowInitAdded = false;
  let buildWorkflowAdded = false;

  for (const part of parts) {
    if (part.type === 'reasoning' && 'text' in part && typeof part.text === 'string') {
      renderItems.push({ type: 'reasoning', text: part.text, state: part.state });
    }

    if (part.type === 'text' && typeof part.text === 'string' && !part.text.startsWith('{')) {
      renderItems.push({ type: 'text', text: part.text, state: part.state });
    }

    if (part.type.startsWith('dynamic-tool')) {
      const tool = part as DynamicToolUIPart;

      if (
        tool.toolName === AiWorkflowToolsEnum.SET_WORKFLOW_METADATA &&
        tool.state === 'output-available' &&
        tool.output &&
        !workflowInitAdded
      ) {
        renderItems.push({ type: 'workflowInit', output: tool.output as WorkflowMetadataOutput });
        workflowInitAdded = true;
      }

      if (tool.toolName === AiWorkflowToolsEnum.ADD_STEP && !buildWorkflowAdded) {
        const stepsSoFar = addStepParts.filter((p) => p.state === 'output-available' && p.output);
        if (stepsSoFar.length > 0) {
          renderItems.push({ type: 'buildWorkflow', steps: stepsSoFar });
          buildWorkflowAdded = true;
        }
      }
    }
  }

  const hasContent = renderItems.length > 0;

  if (!hasContent && !isStreaming && !thinkingDuration) {
    return null;
  }

  const headerText = isStreaming
    ? 'Drafting the workflow'
    : thinkingDuration !== null
      ? `Thought for ${thinkingDuration}s`
      : 'Drafted the workflow';

  return (
    <ChainOfThought open={isExpanded} onOpenChange={setIsExpanded}>
      <ChainOfThoughtHeader className="text-label-xs">
        {isStreaming ? <Shimmer>{headerText}</Shimmer> : headerText}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <div className="flex flex-col gap-3">
          {renderItems.map((item, index) => {
            if (item.type === 'reasoning' || item.type === 'text') {
              return (
                <ChainOfThoughtStep
                  key={`reasoning-${index}`}
                  label={
                    item.state !== 'streaming' ? (
                      <span className="text-label-xs font-medium text-text-sub">Thought</span>
                    ) : (
                      <Shimmer className={cn('text-label-xs font-medium')}>Thinking...</Shimmer>
                    )
                  }
                  status={item.state === 'streaming' ? 'active' : 'complete'}
                  collapsible
                  defaultOpen={true}
                >
                  <StyledMessageResponse>{item.text}</StyledMessageResponse>
                </ChainOfThoughtStep>
              );
            }

            if (item.type === 'workflowInit') {
              return <WorkflowInitializedSection key="workflow-init" output={item.output} />;
            }

            if (item.type === 'buildWorkflow') {
              return (
                <BuildingWorkflowStructureSection
                  key="build-workflow"
                  addStepParts={item.steps}
                  isStreaming={isStreaming}
                />
              );
            }

            return null;
          })}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
