import { ComponentProps } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Node as FlowNode, Handle, NodeProps, Position } from '@xyflow/react';
import { RiFilter3Fill, RiPlayCircleLine } from 'react-icons/ri';
import { RQBJsonLogic } from 'react-querybuilder';
import { WorkflowOriginEnum } from '@novu/shared';

import { createStep } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { getWorkflowIdFromSlug, STEP_DIVIDER } from '@/utils/step';
import { cn } from '@/utils/ui';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { AddStepMenu } from './add-step-menu';
import { Node, NodeBody, NodeError, NodeHeader, NodeIcon, NodeName } from './base-node';
import { useConditionsCount } from '@/hooks/use-conditions-count';

export type NodeData = {
  addStepIndex?: number;
  content?: string;
  error?: string;
  name?: string;
  stepSlug?: string;
  controlValues?: Record<string, any>;
  workflowSlug?: string;
  environment?: string;
  readOnly?: boolean;
};

export type NodeType = FlowNode<NodeData>;

const topHandleClasses = `data-[handlepos=top]:w-2 data-[handlepos=top]:h-2 data-[handlepos=top]:bg-transparent data-[handlepos=top]:rounded-none data-[handlepos=top]:before:absolute data-[handlepos=top]:before:top-0 data-[handlepos=top]:before:left-0 data-[handlepos=top]:before:w-full data-[handlepos=top]:before:h-full data-[handlepos=top]:before:bg-neutral-alpha-200 data-[handlepos=top]:before:rotate-45`;

const bottomHandleClasses = `data-[handlepos=bottom]:w-2 data-[handlepos=bottom]:h-2 data-[handlepos=bottom]:bg-transparent data-[handlepos=bottom]:rounded-none data-[handlepos=bottom]:before:absolute data-[handlepos=bottom]:before:bottom-0 data-[handlepos=bottom]:before:left-0 data-[handlepos=bottom]:before:w-full data-[handlepos=bottom]:before:h-full data-[handlepos=bottom]:before:bg-neutral-alpha-200 data-[handlepos=bottom]:before:rotate-45`;

const handleClassName = `${topHandleClasses} ${bottomHandleClasses}`;

export const TriggerNode = ({
  data,
}: NodeProps<FlowNode<{ environmentSlug: string; workflowSlug: string; readOnly?: boolean }>>) => {
  const content = (
    <Node
      className="relative rounded-tl-none [&>span]:rounded-tl-none"
      pill={
        <>
          <RiPlayCircleLine className="size-3" />
          <span>TRIGGER</span>
        </>
      }
    >
      <NodeHeader type={StepTypeEnum.TRIGGER}>
        <NodeName>Workflow trigger</NodeName>
      </NodeHeader>
      <NodeBody type={StepTypeEnum.TRIGGER} controlValues={{}} showPreview={data.readOnly}>
        This step triggers this workflow
      </NodeBody>
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );

  if (data.readOnly) {
    return content;
  }

  return (
    <Link
      to={buildRoute(ROUTES.TEST_WORKFLOW, {
        environmentSlug: data.environmentSlug,
        workflowSlug: data.workflowSlug,
      })}
    >
      {content}
    </Link>
  );
};

type StepNodeProps = ComponentProps<typeof Node> & { data: NodeData };
const StepNode = (props: StepNodeProps) => {
  const navigate = useNavigate();
  const { className, data, ...rest } = props;
  const { stepSlug } = useParams<{
    stepSlug: string;
  }>();

  const conditionsCount = useConditionsCount(data.controlValues?.skip as RQBJsonLogic);

  const isSelected =
    getWorkflowIdFromSlug({ slug: stepSlug ?? '', divider: STEP_DIVIDER }) ===
      getWorkflowIdFromSlug({ slug: data.stepSlug ?? '', divider: STEP_DIVIDER }) &&
    !!stepSlug &&
    !!data.stepSlug;

  const hasConditions = conditionsCount > 0;

  if (hasConditions) {
    return (
      <Node
        aria-selected={isSelected}
        className={cn('group rounded-tl-none [&>span]:rounded-tl-none', className)}
        pill={
          <>
            <RiFilter3Fill className="text-foreground-400 size-3" />
            <span className="text-foreground-400 text-xs">{conditionsCount}</span>
          </>
        }
        onPillClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(buildRoute(ROUTES.EDIT_STEP_CONDITIONS, { stepSlug: data.stepSlug ?? '' }));
        }}
        {...rest}
      />
    );
  }

  return <Node aria-selected={isSelected} className={cn('group', className)} {...rest} />;
};

const NodeWrapper = ({ children, data }: { children: React.ReactNode; data: NodeData }) => {
  if (data.readOnly) {
    return children;
  }

  return (
    <Link
      to={buildRoute(ROUTES.EDIT_STEP, { stepSlug: data.stepSlug ?? '' })}
      onClick={(e) => {
        // Prevent any bubbling that might interfere with the navigation
        e.stopPropagation();
      }}
      className="contents"
    >
      {children}
    </Link>
  );
};

export const EmailNode = ({ data }: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.EMAIL}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.EMAIL]}>
            <Icon />
          </NodeIcon>

          <NodeName>{data.name || 'Email Step'}</NodeName>
        </NodeHeader>

        <NodeBody type={StepTypeEnum.EMAIL} showPreview={data.readOnly} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const SmsNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.SMS];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.SMS}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.SMS]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'SMS Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={data.readOnly} type={StepTypeEnum.SMS} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const InAppNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.IN_APP}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'In-App Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={data.readOnly} type={StepTypeEnum.IN_APP} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const PushNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.PUSH];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.PUSH}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.PUSH]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Push Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={data.readOnly} type={StepTypeEnum.PUSH} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const ChatNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CHAT];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.CHAT}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.CHAT]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Chat Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={data.readOnly} type={StepTypeEnum.CHAT} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const DelayNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.DELAY];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.DELAY}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.DELAY]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Delay Step'}</NodeName>
        </NodeHeader>
        <NodeBody type={StepTypeEnum.DELAY} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const DigestNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.DIGEST];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.DIGEST}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.DIGEST]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Digest Step'}</NodeName>
        </NodeHeader>
        <NodeBody type={StepTypeEnum.DIGEST} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const CustomNode = (props: NodeProps<NodeType>) => {
  const { data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CUSTOM];

  return (
    <NodeWrapper data={data}>
      <StepNode data={data}>
        <NodeHeader type={StepTypeEnum.CUSTOM}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.CUSTOM]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Custom Step'}</NodeName>
        </NodeHeader>
        <NodeBody type={StepTypeEnum.CUSTOM} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const AddNode = (_props: NodeProps<NodeType>) => {
  const { workflow, update } = useWorkflow();
  const navigate = useNavigate();
  if (!workflow) {
    return null;
  }

  const isReadOnly = workflow.origin === WorkflowOriginEnum.EXTERNAL;
  if (isReadOnly) {
    return null;
  }

  return (
    <div className="flex w-[300px] cursor-pointer justify-center">
      <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
      <AddStepMenu
        visible
        onMenuItemClick={(stepType) => {
          update(
            {
              ...workflow,
              steps: [...workflow.steps, createStep(stepType)],
            },
            {
              onSuccess: (data) => {
                if (TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(stepType)) {
                  navigate(
                    buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                      workflowSlug: workflow.slug,
                      stepSlug: data.steps[data.steps.length - 1].slug,
                    })
                  );
                }
              },
            }
          );
        }}
      />
    </div>
  );
};
