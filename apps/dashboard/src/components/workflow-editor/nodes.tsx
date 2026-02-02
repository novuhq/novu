import { Slug } from '@novu/shared';
import { Node as FlowNode, Handle, NodeProps, Position } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { ComponentProps, KeyboardEventHandler, useCallback, useState } from 'react';
import { RiInsertRowTop, RiPlayCircleLine } from 'react-icons/ri';
import { RQBJsonLogic } from 'react-querybuilder';
import { Link } from 'react-router-dom';
import { useConditionsCount } from '@/hooks/use-conditions-count';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { cn } from '@/utils/ui';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { AddStepMenu } from './add-step-menu';
import { AnimationStepWrapper } from './animation-step-wrapper';
import { NODE_WIDTH, Node, NodeBody, NodeError, NodeHeader, NodeIcon, NodeName } from './base-node';
import { ConditionBadge } from './condition-badge';
import { useCanvasContext } from './drag-context';
import { WorkflowNodeActionBar } from './workflow-node-action-bar';

export type NodeData = {
  index: number;
  content?: string;
  error?: string;
  name?: string;
  stepSlug?: Slug;
  controlValues?: Record<string, unknown>;
  isPending?: boolean;
  triggerLink?: string;
};

export type NodeType = FlowNode<NodeData>;

const topHandleClasses = `data-[handlepos=top]:w-2! data-[handlepos=top]:h-2! data-[handlepos=top]:bg-transparent! data-[handlepos=top]:rounded-none! data-[handlepos=top]:before:absolute! data-[handlepos=top]:before:top-0! data-[handlepos=top]:before:left-0! data-[handlepos=top]:before:w-full! data-[handlepos=top]:before:h-full! data-[handlepos=top]:before:bg-neutral-alpha-200! data-[handlepos=top]:before:rotate-45!`;
const bottomHandleClasses = `data-[handlepos=bottom]:w-2! data-[handlepos=bottom]:h-2! data-[handlepos=bottom]:bg-transparent! data-[handlepos=bottom]:rounded-none! data-[handlepos=bottom]:before:absolute! data-[handlepos=bottom]:before:bottom-0! data-[handlepos=bottom]:before:left-0! data-[handlepos=bottom]:before:w-full! data-[handlepos=bottom]:before:h-full! data-[handlepos=bottom]:before:bg-neutral-alpha-200! data-[handlepos=bottom]:before:rotate-45!`;
const handleClassName = `${topHandleClasses} ${bottomHandleClasses}`;

export const TriggerNode = ({ data }: NodeProps<FlowNode<{ triggerLink?: string }>>) => {
  const { isReadOnly, showStepPreview } = useCanvasContext();
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
      <NodeBody type={StepTypeEnum.TRIGGER} controlValues={{}} showPreview={showStepPreview}>
        This step triggers this workflow
      </NodeBody>
      {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );

  if (isReadOnly) {
    return content;
  }

  return <Link to={data.triggerLink ?? ''}>{content}</Link>;
};

type StepNodeProps = ComponentProps<typeof Node> & {
  data: NodeData;
  type?: StepTypeEnum;
};

const StepNode = (props: StepNodeProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const { id, className, data, type, ...rest } = props;
  const [isHovered, setIsHovered] = useState(false);
  const conditionsCount = useConditionsCount(data.controlValues?.skip as RQBJsonLogic);
  const {
    isReadOnly,
    showStepPreview,
    onNodeDragEnd,
    onNodeDragMove,
    onNodeDragStart,
    draggedNodeId,
    intersectingNodeId,
    updateEdges,
    removeEdges,
    copyNode,
    removeNode,
    selectedNodeId,
    selectNode,
  } = useCanvasContext();
  const isAnyNodeDragging = draggedNodeId !== null;
  const areActionsVisible = !isAnyNodeDragging && isHovered && !showStepPreview && !!type;
  const hasConditions = conditionsCount > 0;
  const isDraggable = !isReadOnly && !showStepPreview;

  const handleMouseEnter = () => {
    if (!isAnyNodeDragging) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleRemoveStep = useCallback(() => {
    setIsRemoving(true);

    removeNode(data.index, {
      onError: () => {
        setIsRemoving(false);
      },
    });
  }, [data, removeNode]);

  const handleCopyStep = useCallback(() => {
    copyNode(data.index);
  }, [data, copyNode]);

  const handleEditContent = useCallback(() => {
    if (!id || data.isPending) {
      return;
    }

    selectNode(id, 'editor');
  }, [id, selectNode, data]);

  const handleNodeDragEnd = useCallback(() => {
    setIsHovered(false);
    onNodeDragEnd();
  }, [onNodeDragEnd]);

  return (
    <AnimatePresence>
      <motion.div
        layout
        layoutId={id} // should be a stable id for the animation
        className={cn('relative pt-1 pl-6 -ml-6')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLayoutAnimationStart={() => removeEdges()}
        onLayoutAnimationComplete={() => updateEdges()}
      >
        <AnimationStepWrapper isPending={data.isPending} isRemoving={isRemoving}>
          <Node
            aria-selected={selectedNodeId === id}
            className={cn(
              'group transition-all',
              {
                'pointer-events-none opacity-40': isAnyNodeDragging && id === draggedNodeId,
                'pointer-events-none scale-95 border border-dashed border-bg-soft bg-transparent aria-selected:bg-none':
                  isAnyNodeDragging && id === intersectingNodeId,
              },
              className
            )}
            nodeId={id}
            isDraggable={isDraggable}
            isDragHandleVisible={areActionsVisible}
            onNodeDragStart={onNodeDragStart}
            onNodeDragMove={onNodeDragMove}
            onNodeDragEnd={handleNodeDragEnd}
            {...rest}
          >
            {rest.children}
          </Node>
        </AnimationStepWrapper>
        {hasConditions && (
          <ConditionBadge
            conditionsCount={conditionsCount}
            stepSlug={data.stepSlug ?? ''}
            conditionsData={data.controlValues?.skip as RQBJsonLogic}
            className={cn('ml-6 transition-all', {
              'pointer-events-none opacity-40': isAnyNodeDragging && id === draggedNodeId,
              'pointer-events-none scale-95 -mt-[2px]': isAnyNodeDragging && id === intersectingNodeId,
            })}
          />
        )}
        <WorkflowNodeActionBar
          isVisible={areActionsVisible}
          stepType={type}
          stepName={data.name || 'Untitled Step'}
          onRemoveClick={handleRemoveStep}
          onEditContentClick={handleEditContent}
          onCopyClick={handleCopyStep}
          isReadOnly={isReadOnly}
        />
      </motion.div>
    </AnimatePresence>
  );
};

const NodeWrapper = ({ children, id, type }: { children: React.ReactNode; id: string; type: StepTypeEnum }) => {
  const { selectedNodeId, selectNode, showStepPreview } = useCanvasContext();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const clickCount = e.detail ?? 1;

      if (clickCount > 1) {
        selectNode(id, 'editor');

        return;
      }

      selectNode(id, 'view');
    },
    [id, selectNode]
  );

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!selectedNodeId) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      selectNode(id, 'editor');
    }
  };

  if (showStepPreview) {
    return children;
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="cursor-pointer focus-visible:outline-hidden"
      data-testid={`${type}-node`}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  );
};

export const EmailNode = ({ id, data }: NodeProps<NodeType>) => {
  const { showStepPreview } = useCanvasContext();
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.EMAIL}>
      <StepNode id={id} data={data} type={StepTypeEnum.EMAIL}>
        <NodeHeader type={StepTypeEnum.EMAIL}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.EMAIL]}>
            <Icon />
          </NodeIcon>

          <NodeName>{data.name || 'Email Step'}</NodeName>
        </NodeHeader>

        <NodeBody type={StepTypeEnum.EMAIL} showPreview={showStepPreview} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const SmsNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const { showStepPreview } = useCanvasContext();
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.SMS];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.SMS}>
      <StepNode id={id} data={data} type={StepTypeEnum.SMS}>
        <NodeHeader type={StepTypeEnum.SMS}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.SMS]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'SMS Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={showStepPreview} type={StepTypeEnum.SMS} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const InAppNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const { showStepPreview } = useCanvasContext();
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.IN_APP}>
      <StepNode id={id} data={data} type={StepTypeEnum.IN_APP}>
        <NodeHeader type={StepTypeEnum.IN_APP}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'In-App Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={showStepPreview} type={StepTypeEnum.IN_APP} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const PushNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const { showStepPreview } = useCanvasContext();
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.PUSH];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.PUSH}>
      <StepNode id={id} data={data} type={StepTypeEnum.PUSH}>
        <NodeHeader type={StepTypeEnum.PUSH}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.PUSH]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Push Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={showStepPreview} type={StepTypeEnum.PUSH} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const ChatNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const { showStepPreview } = useCanvasContext();
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CHAT];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.CHAT}>
      <StepNode id={id} data={data} type={StepTypeEnum.CHAT}>
        <NodeHeader type={StepTypeEnum.CHAT}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.CHAT]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Chat Step'}</NodeName>
        </NodeHeader>
        <NodeBody showPreview={showStepPreview} type={StepTypeEnum.CHAT} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const DelayNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.DELAY];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.DELAY}>
      <StepNode id={id} data={data} type={StepTypeEnum.DELAY}>
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
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const DigestNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.DIGEST];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.DIGEST}>
      <StepNode id={id} data={data} type={StepTypeEnum.DIGEST}>
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
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const ThrottleNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.THROTTLE];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.THROTTLE}>
      <StepNode id={id} data={data} type={StepTypeEnum.THROTTLE}>
        <NodeHeader type={StepTypeEnum.THROTTLE}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.THROTTLE]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Throttle Step'}</NodeName>
        </NodeHeader>
        <NodeBody type={StepTypeEnum.THROTTLE} controlValues={data.controlValues ?? {}}>
          {data.content}
        </NodeBody>
        {data.error && <NodeError>{data.error}</NodeError>}
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const CustomNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CUSTOM];

  return (
    <NodeWrapper id={id} type={StepTypeEnum.CUSTOM}>
      <StepNode id={id} data={data} type={StepTypeEnum.CUSTOM}>
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
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
      </StepNode>
    </NodeWrapper>
  );
};

export const AddNode = (props: NodeProps<NodeType>) => {
  const { isReadOnly, intersectingNodeId, addNode, removeEdges, updateEdges } = useCanvasContext();
  const { id, data } = props;
  const isIntersecting = intersectingNodeId === id;

  return (
    <AnimatePresence>
      <motion.div
        layout
        layoutId={id} // should be a stable id for the animation
        className="flex cursor-pointer justify-center items-center"
        style={{ width: NODE_WIDTH, height: 32 }}
        data-droppable-add-node-id={id}
        onLayoutAnimationStart={() => removeEdges()}
        onLayoutAnimationComplete={() => updateEdges()}
      >
        {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
        <Handle isConnectable={false} className={handleClassName} type="target" position={Position.Top} id="a" />
        <div
          className="bg-background rounded-lg border border-dashed border-bg-soft flex items-center justify-center gap-1"
          style={{
            position: 'absolute',
            transition: 'opacity 0.2s ease-in-out',
            fontSize: 12,
            pointerEvents: 'all',
            width: NODE_WIDTH,
            height: 32,
            opacity: isIntersecting ? 1 : 0,
          }}
        >
          <RiInsertRowTop className="size-3.5 text-text-soft" />
          <span className="text-label-xs text-text-soft">Drop here</span>
        </div>
        {!isIntersecting && (
          <AddStepMenu
            disabled={isReadOnly}
            visible
            className="-mt-1"
            onMenuItemClick={(stepType) => addNode(data.index, stepType)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
