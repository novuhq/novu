import { AiWorkflowToolsEnum } from '@novu/shared';
import { DynamicToolUIPart, UIMessage } from 'ai';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddBoxLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiDeleteBin2Line,
  RiEdit2Line,
  RiListView,
  RiLoader3Line,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtStep } from '../ai-elements/chain-of-thought';
import { Shimmer } from '../ai-elements/shimmer';
import { Broom } from '../icons/broom';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { Badge } from '../primitives/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/collapsible';
import { Skeleton } from '../primitives/skeleton';
import { Tag } from '../primitives/tag';
import { PayloadSchemaDrawer } from '../workflow-editor/payload-schema-drawer';
import { useWorkflow } from '../workflow-editor/workflow-provider';
import { StyledMessageResponse } from './chat-message-response';
import { isCancelledToolCall, unwrapToolResult } from './message-utils';

const toolNameToAction: Record<string, 'add' | 'edit' | 'remove'> = {
  [AiWorkflowToolsEnum.ADD_STEP]: 'add',
  [AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN]: 'add',
  [AiWorkflowToolsEnum.EDIT_STEP_CONTENT]: 'edit',
  [AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS]: 'edit',
  [AiWorkflowToolsEnum.REMOVE_STEP]: 'remove',
  [AiWorkflowToolsEnum.MOVE_STEP]: 'edit',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const CheckCircleIcon = (props: React.ComponentPropsWithoutRef<typeof RiCheckLine>) => {
  return <RiCheckLine {...props} className={cn('p-0.5 rounded-full bg-[#F8F8F9]', props.className)} />;
};

const BroomIcon = (props: React.ComponentPropsWithoutRef<typeof Broom>) => {
  return <Broom {...props} className={cn('p-0.5', props.className)} />;
};

const ErrorCircleIcon = (props: React.ComponentPropsWithoutRef<typeof RiCloseCircleLine>) => {
  return <RiCloseCircleLine {...props} className={cn('p-0.5 rounded-full text-destructive', props.className)} />;
};

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
      <span className="font-mono text-label-xs font-medium text-text-soft">{term}</span>
      <div className="flex items-center gap-1 overflow-hidden">{children}</div>
    </div>
  );
}

function WorkflowInitializedSection({
  output,
  isStreaming,
}: {
  output: WorkflowMetadataOutput | undefined;
  isStreaming: boolean;
}) {
  if (isStreaming || !output) {
    return (
      <ChainOfThoughtStep
        label={<Shimmer className={cn('text-label-xs font-medium')}>Drafting Workflow metadata</Shimmer>}
        status="active"
        icon={BroomIcon}
        collapsible={false}
        defaultOpen={false}
      />
    );
  }

  const workflowId = slugify(output.name);

  return (
    <ChainOfThoughtStep
      label={
        <span className={cn('flex items-center justify-between gap-1')}>
          <span className="text-label-xs font-medium text-text-soft">Workflow metadata</span>
        </span>
      }
      status="complete"
      icon={CheckCircleIcon}
      collapsible
      defaultOpen={false}
    >
      <div className="flex flex-col gap-1.5 rounded-lg p-2">
        <MetadataRow term="Workflow">
          <span className="font-mono text-code-xs text-text-sub truncate" title={output.name}>
            {output.name}
          </span>
        </MetadataRow>
        <MetadataRow term="ID">
          <span className="font-mono text-code-xs text-text-sub truncate" title={workflowId}>
            {workflowId}
          </span>
        </MetadataRow>
        {output.description && (
          <Collapsible defaultOpen={false} className="group [&[data-state=open]_.chevron-icon]:rotate-90">
            <div className="flex flex-col gap-1 py-0.5 pl-1 pr-1.5">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-5 text-left transition-opacity hover:opacity-80">
                <span className="font-mono text-label-xs font-medium text-text-soft">Description</span>
                <RiArrowRightSLine className="chevron-icon size-3.5 transition-transform text-text-soft" />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <span className="font-mono text-code-xs text-text-sub text-left">{output.description}</span>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        {output.severity && (
          <MetadataRow term="Severity">
            <span className="font-mono text-code-xs text-text-sub capitalize">{output.severity}</span>
          </MetadataRow>
        )}
        {output.critical != null && (
          <MetadataRow term="Critical">
            <span className="font-mono text-code-xs text-text-sub">{output.critical ? 'ON' : 'OFF'}</span>
          </MetadataRow>
        )}
        {output.tags && output.tags.length > 0 && (
          <Collapsible defaultOpen={false} className="group [&[data-state=open]_.chevron-icon]:rotate-90">
            <div className="flex flex-col gap-1 py-0.5 pl-1 pr-1.5">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-5 text-left transition-opacity hover:opacity-80">
                <span className="font-mono text-label-xs font-medium text-text-soft">Tags</span>
                <RiArrowRightSLine className="chevron-icon size-3.5 transition-transform text-text-soft" />
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

const stepItemBaseClasses =
  "flex items-center gap-2 rounded-lg border border-[#E1E4EA] px-2 py-1 not-last:relative not-last:after:content-[''] not-last:after:absolute not-last:after:-bottom-[9px] not-last:after:left-4.5 not-last:after:h-[9px] not-last:after:border-l not-last:after:border-bg-soft";

const stepTransition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] } as const;

function WorkflowStepItem({
  output,
  isStreaming,
  action,
}: {
  output?: { stepId: string; name: string; type: string };
  isStreaming: boolean;
  action: 'add' | 'edit' | 'remove';
}) {
  const navigate = useNavigate();
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const showStreaming = isStreaming || !output;
  const stepType = (output?.type ?? StepTypeEnum.IN_APP) as StepTypeEnum;
  const Icon = STEP_TYPE_TO_ICON[stepType] ?? STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];
  const color = STEP_TYPE_TO_COLOR[stepType] ?? STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP];

  const matchedStep = useMemo(
    () => workflow?.steps.find((s) => s.stepId === output?.stepId),
    [workflow?.steps, output?.stepId]
  );
  const isClickable = !!matchedStep && action !== 'remove';
  const routeStepType = (matchedStep?.type ?? stepType) as StepTypeEnum;

  const handleClick = () => {
    if (!isClickable || !matchedStep) return;

    const baseParams = {
      environmentSlug: currentEnvironment?.slug ?? '',
      workflowSlug: workflow?.slug ?? '',
    };

    const stepRoute =
      routeStepType === StepTypeEnum.DELAY ||
      routeStepType === StepTypeEnum.DIGEST ||
      routeStepType === StepTypeEnum.THROTTLE
        ? ROUTES.EDIT_STEP
        : ROUTES.EDIT_STEP_TEMPLATE;

    const absolutePath = `${buildRoute(ROUTES.EDIT_WORKFLOW, baseParams)}/${buildRoute(stepRoute, { stepSlug: matchedStep.slug })}`;
    navigate(absolutePath);
  };

  return (
    <AnimatePresence mode="wait">
      {showStreaming ? (
        <motion.div
          key="streaming"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={stepTransition}
          className={cn(stepItemBaseClasses, 'border-dashed bg-white')}
        >
          <Skeleton className="flex size-5 items-center justify-center opacity-40 rounded-full" />
          <Skeleton className="w-20 h-4" />
          <RiLoader3Line className="size-4 ml-auto text-[#E1E4EA] animate-spin" />
        </motion.div>
      ) : (
        <motion.div
          key="complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={stepTransition}
          className={cn(stepItemBaseClasses, 'bg-bg-weak', isClickable && 'cursor-pointer hover:bg-bg-weak/80')}
          onClick={isClickable ? handleClick : undefined}
        >
          <div
            className="flex size-5 min-w-5 items-center justify-center border opacity-40 rounded-full"
            style={{ borderColor: `hsl(var(--${color}))`, color: `hsl(var(--${color}))` }}
          >
            <Icon className="size-3" />
          </div>
          <span className="text-label-xs text-text-sub truncate">{output?.name ?? ''}</span>
          <span className="block truncate text-label-xs text-text-soft font-code italic font-normal">
            {output?.stepId ?? ''}
          </span>
          <span className="ml-auto flex items-center gap-1 text-label-xs text-success-base">
            {action === 'add' ? (
              <Badge variant="lighter" color="green">
                <RiAddBoxLine className="size-3" /> Added
              </Badge>
            ) : action === 'edit' ? (
              <Badge variant="lighter" color="orange">
                <RiEdit2Line className="size-3" /> Modified
              </Badge>
            ) : (
              <Badge variant="lighter" color="red">
                <RiDeleteBin2Line className="size-3" /> Removed
              </Badge>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepTool({
  stepOutput,
  error,
  isStreaming,
  labelStreaming,
  labelComplete,
  labelError,
  action,
}: {
  stepOutput?: { stepId: string; name: string; type: string };
  error?: string | null;
  isStreaming: boolean;
  labelStreaming: string;
  labelComplete: string;
  labelError: string;
  action: 'add' | 'edit' | 'remove';
}) {
  const hasError = !!error;
  const status = hasError ? 'error' : isStreaming ? 'active' : 'complete';
  const icon = hasError ? ErrorCircleIcon : isStreaming ? BroomIcon : CheckCircleIcon;

  const label = isStreaming ? (
    <Shimmer className={cn('text-label-xs font-medium')}>{labelStreaming}</Shimmer>
  ) : hasError ? (
    <span className="text-label-xs font-medium">{labelError}</span>
  ) : (
    <span className={cn('flex items-center justify-between gap-1')}>
      <span className="text-label-xs font-medium text-text-soft">{labelComplete}</span>
    </span>
  );

  return (
    <ChainOfThoughtStep
      label={label}
      status={status}
      icon={icon}
      collapsible
      defaultOpen={!hasError}
      autoCollapse={hasError}
    >
      {hasError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 my-2 px-2 py-1">
          <span className="text-label-xs text-destructive">{error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-2 pl-0 pr-0">
          <WorkflowStepItem output={stepOutput} isStreaming={isStreaming} action={action} />
        </div>
      )}
    </ChainOfThoughtStep>
  );
}

type PayloadSchemaOutput = { added: string[]; removed: string[] };

function PayloadSchemaToolItem({ output, isStreaming }: { output?: PayloadSchemaOutput; isStreaming: boolean }) {
  const { workflow } = useWorkflow();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const showStreaming = isStreaming || !output;
  const isClickable = !!workflow && !showStreaming;

  const addedCount = output?.added?.length ?? 0;
  const removedCount = output?.removed?.length ?? 0;

  return (
    <>
      <AnimatePresence mode="wait">
        {showStreaming ? (
          <motion.div
            key="streaming"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={stepTransition}
            className={cn(stepItemBaseClasses, 'border-dashed bg-white')}
          >
            <Skeleton className="flex size-5 items-center justify-center opacity-40 rounded-full" />
            <Skeleton className="w-20 h-4" />
            <RiLoader3Line className="size-4 ml-auto text-[#E1E4EA] animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={stepTransition}
            className={cn(stepItemBaseClasses, 'bg-bg-weak', isClickable && 'cursor-pointer hover:bg-bg-weak/80')}
            onClick={isClickable ? () => setIsDrawerOpen(true) : undefined}
          >
            <div className="flex size-5 min-w-5 items-center justify-center border opacity-40 rounded-full border-text-soft text-text-soft">
              <RiListView className="size-3" />
            </div>
            <span className="text-label-xs text-text-sub truncate">Payload Schema</span>
            <span className="ml-auto flex items-center gap-1">
              {addedCount > 0 && (
                <Badge variant="lighter" color="green">
                  <RiAddBoxLine className="size-3" /> {addedCount} added
                </Badge>
              )}
              {removedCount > 0 && (
                <Badge variant="lighter" color="red">
                  <RiDeleteBin2Line className="size-3" /> {removedCount} removed
                </Badge>
              )}
              {addedCount === 0 && removedCount === 0 && (
                <Badge variant="lighter" color="orange">
                  <RiEdit2Line className="size-3" /> Modified
                </Badge>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {isClickable && (
        <PayloadSchemaDrawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} workflow={workflow} readOnly />
      )}
    </>
  );
}

function PayloadSchemaTool({
  output,
  error,
  isStreaming,
}: {
  output?: PayloadSchemaOutput;
  error?: string | null;
  isStreaming: boolean;
}) {
  const hasError = !!error;
  const status = hasError ? 'error' : isStreaming ? 'active' : 'complete';
  const icon = hasError ? ErrorCircleIcon : isStreaming ? BroomIcon : CheckCircleIcon;

  const label = isStreaming ? (
    <Shimmer className={cn('text-label-xs font-medium')}>Updating Payload Schema</Shimmer>
  ) : hasError ? (
    <span className="text-label-xs font-medium">Failed to Update Payload Schema</span>
  ) : (
    <span className={cn('flex items-center justify-between gap-1')}>
      <span className="text-label-xs font-medium text-text-soft">Updated Payload Schema</span>
    </span>
  );

  return (
    <ChainOfThoughtStep
      label={label}
      status={status}
      icon={icon}
      collapsible
      defaultOpen={!hasError}
      autoCollapse={hasError}
    >
      {hasError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 my-2 px-2 py-1">
          <span className="text-label-xs text-destructive">{error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-2 pl-0 pr-0">
          <PayloadSchemaToolItem output={output} isStreaming={isStreaming} />
        </div>
      )}
    </ChainOfThoughtStep>
  );
}

const toolNameToStreamingLabel = {
  [AiWorkflowToolsEnum.ADD_STEP]: 'Drafting Workflow Step',
  [AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN]: 'Drafting Workflow Step In Between',
  [AiWorkflowToolsEnum.EDIT_STEP_CONTENT]: 'Updating Workflow Step Content',
  [AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS]: 'Updating Workflow Step Conditions',
  [AiWorkflowToolsEnum.REMOVE_STEP]: 'Removing Workflow Step',
  [AiWorkflowToolsEnum.MOVE_STEP]: 'Moving Workflow Step',
};

const toolNameToCompleteLabel = {
  [AiWorkflowToolsEnum.ADD_STEP]: 'Added Workflow Step',
  [AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN]: 'Added Workflow Step In Between',
  [AiWorkflowToolsEnum.EDIT_STEP_CONTENT]: 'Modified Workflow Step Content',
  [AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS]: 'Modified Workflow Step Conditions',
  [AiWorkflowToolsEnum.REMOVE_STEP]: 'Removed Workflow Step',
  [AiWorkflowToolsEnum.MOVE_STEP]: 'Moved Workflow Step',
};

const toolNameToErrorLabel = {
  [AiWorkflowToolsEnum.ADD_STEP]: 'Failed to Add Workflow Step',
  [AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN]: 'Failed to Add Workflow Step In Between',
  [AiWorkflowToolsEnum.EDIT_STEP_CONTENT]: 'Failed to Update Workflow Step Content',
  [AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS]: 'Failed to Update Workflow Step Conditions',
  [AiWorkflowToolsEnum.REMOVE_STEP]: 'Failed to Remove Workflow Step',
  [AiWorkflowToolsEnum.MOVE_STEP]: 'Failed to Move Workflow Step',
};

const STREAMING_MAX_LINES = 4;
const STREAMING_LINE_HEIGHT_REM = 1.25;
const STREAMING_MAX_HEIGHT = `${STREAMING_MAX_LINES * STREAMING_LINE_HEIGHT_REM}rem`;

function ScrollableReasoningBody({ body, isStreaming }: { body: string; isStreaming: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setClamped(true);

      return;
    }

    const id = setTimeout(() => setClamped(false), 400);

    return () => clearTimeout(id);
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming && scrollRef.current && body.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [body, isStreaming]);

  const showClamped = isStreaming || clamped;

  return (
    <div
      ref={scrollRef}
      className={cn(
        'mt-0.5 overflow-hidden',
        showClamped &&
          'mask-[linear-gradient(transparent_0%,black_30%)] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]'
      )}
      style={showClamped ? { maxHeight: STREAMING_MAX_HEIGHT } : undefined}
    >
      <StyledMessageResponse>{body}</StyledMessageResponse>
    </div>
  );
}

type ChatChainOfThoughtReasoningProps = {
  message: UIMessage;
};

export function ChatChainOfThought({ message }: ChatChainOfThoughtReasoningProps) {
  const toolParts = useMemo(
    () =>
      (message.parts ?? []).filter(
        (p) => p.type.startsWith('dynamic-tool') && !isCancelledToolCall(p as DynamicToolUIPart)
      ) as DynamicToolUIPart[],
    [message.parts]
  );

  return (
    <ChainOfThought open className="text-text-soft">
      <ChainOfThoughtContent className="mb-2">
        <div className="flex flex-col gap-3">
          {toolParts.map((tool) => {
            if (tool.toolName === AiWorkflowToolsEnum.REASONING) {
              const input = tool.input as { label?: string; thought?: string } | undefined;
              const label = input?.label ?? 'Reasoning...';
              const body = input?.thought ?? '';
              const isStreaming = tool.state !== 'output-available';

              return (
                <ChainOfThoughtStep
                  key={`${tool.toolCallId}-${tool.toolName}`}
                  icon={isStreaming ? BroomIcon : CheckCircleIcon}
                  label={
                    isStreaming ? (
                      <Shimmer className={cn('text-label-xs font-medium')}>{label}</Shimmer>
                    ) : (
                      <span className="text-label-xs font-medium text-text-soft">{label}</span>
                    )
                  }
                  collapsible
                  autoCollapse
                  status={isStreaming ? 'active' : 'complete'}
                  defaultOpen={isStreaming}
                >
                  <ScrollableReasoningBody body={body} isStreaming={isStreaming} />
                </ChainOfThoughtStep>
              );
            }

            if (tool.toolName === AiWorkflowToolsEnum.SET_WORKFLOW_METADATA) {
              return (
                <WorkflowInitializedSection
                  key={`${tool.toolCallId}-${tool.toolName}`}
                  output={unwrapToolResult<WorkflowMetadataOutput>(tool.output)}
                  isStreaming={tool.state !== 'output-available'}
                />
              );
            }

            if (
              tool.toolName === AiWorkflowToolsEnum.ADD_STEP ||
              tool.toolName === AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN ||
              tool.toolName === AiWorkflowToolsEnum.EDIT_STEP_CONTENT ||
              tool.toolName === AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS ||
              tool.toolName === AiWorkflowToolsEnum.REMOVE_STEP ||
              tool.toolName === AiWorkflowToolsEnum.MOVE_STEP
            ) {
              const streamingLabel = toolNameToStreamingLabel[tool.toolName];
              const completeLabel = toolNameToCompleteLabel[tool.toolName];
              const errorLabel = toolNameToErrorLabel[tool.toolName];
              const action = toolNameToAction[tool.toolName];

              return (
                <StepTool
                  key={`${tool.toolCallId}-${tool.toolName}`}
                  stepOutput={unwrapToolResult<{ stepId: string; name: string; type: string }>(tool.output)}
                  isStreaming={tool.state !== 'output-available' && tool.state !== 'output-error'}
                  labelStreaming={streamingLabel}
                  labelComplete={completeLabel}
                  labelError={errorLabel}
                  action={action}
                  error={tool.state === 'output-error' ? tool.errorText : undefined}
                />
              );
            }

            if (tool.toolName === AiWorkflowToolsEnum.UPDATE_PAYLOAD_SCHEMA) {
              return (
                <PayloadSchemaTool
                  key={`${tool.toolCallId}-${tool.toolName}`}
                  output={unwrapToolResult<PayloadSchemaOutput>(tool.output)}
                  isStreaming={tool.state !== 'output-available' && tool.state !== 'output-error'}
                  error={tool.state === 'output-error' ? tool.errorText : undefined}
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
