import { EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum, StepCreateDto } from '@novu/shared';
import { Node as FlowNode, Handle, NodeProps, Position } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { ComponentProps, useCallback, useState } from 'react';
import { RiInsertRowTop, RiPlayCircleLine } from 'react-icons/ri';
import { RQBJsonLogic } from 'react-querybuilder';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createStep } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useConditionsCount } from '@/hooks/use-conditions-count';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useHasPermission } from '@/hooks/use-has-permission';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { INLINE_CONFIGURABLE_STEP_TYPES, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { StepTypeEnum } from '@/utils/enums';
import { getIdFromSlug, STEP_DIVIDER } from '@/utils/id-utils';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { STEP_TYPE_TO_ICON } from '../icons/utils';
import { AddStepMenu } from './add-step-menu';
import { NODE_WIDTH, Node, NodeBody, NodeError, NodeHeader, NodeIcon, NodeName } from './base-node';
import { ConditionBadge } from './condition-badge';
import { useDragContext } from './drag-context';
import { WorkflowNodeActionBar } from './workflow-node-action-bar';

export type NodeData = {
  stepId: string;
  addStepIndex?: number;
  content?: string;
  error?: string;
  name?: string;
  stepSlug?: string;
  controlValues?: Record<string, any>;
  workflowSlug?: string;
  environment?: string;
  isTemplateStorePreview?: boolean;
};

export type NodeType = FlowNode<NodeData>;

const topHandleClasses = `data-[handlepos=top]:w-2 data-[handlepos=top]:h-2 data-[handlepos=top]:bg-transparent data-[handlepos=top]:rounded-none data-[handlepos=top]:before:absolute data-[handlepos=top]:before:top-0 data-[handlepos=top]:before:left-0 data-[handlepos=top]:before:w-full data-[handlepos=top]:before:h-full data-[handlepos=top]:before:bg-neutral-alpha-200 data-[handlepos=top]:before:rotate-45`;

const bottomHandleClasses = `data-[handlepos=bottom]:w-2 data-[handlepos=bottom]:h-2 data-[handlepos=bottom]:bg-transparent data-[handlepos=bottom]:rounded-none data-[handlepos=bottom]:before:absolute data-[handlepos=bottom]:before:bottom-0 data-[handlepos=bottom]:before:left-0 data-[handlepos=bottom]:before:w-full data-[handlepos=bottom]:before:h-full data-[handlepos=bottom]:before:bg-neutral-alpha-200 data-[handlepos=bottom]:before:rotate-45`;

const handleClassName = `${topHandleClasses} ${bottomHandleClasses}`;

export const TriggerNode = ({
  data,
}: NodeProps<FlowNode<{ environment: string; workflowSlug: string; isTemplateStorePreview?: boolean }>>) => {
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
      <NodeBody type={StepTypeEnum.TRIGGER} controlValues={{}} showPreview={data.isTemplateStorePreview}>
        This step triggers this workflow
      </NodeBody>
      {/* biome-ignore lint/correctness/useUniqueElementIds: used internally by react-flow */}
      <Handle isConnectable={false} className={handleClassName} type="source" position={Position.Bottom} id="b" />
    </Node>
  );

  if (data.isTemplateStorePreview) {
    return content;
  }

  return (
    <Link
      to={buildRoute(ROUTES.TRIGGER_WORKFLOW, {
        environmentSlug: data.environment,
        workflowSlug: data.workflowSlug,
      })}
    >
      {content}
    </Link>
  );
};

type StepNodeProps = ComponentProps<typeof Node> & {
  data: NodeData;
  type?: StepTypeEnum;
};

const StepNode = (props: StepNodeProps) => {
  const navigate = useNavigate();
  const { className, data, type, ...rest } = props;
  const { stepSlug } = useParams<{
    stepSlug: string;
  }>();
  const { workflow: currentWorkflow, update } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const [isHovered, setIsHovered] = useState(false);
  const conditionsCount = useConditionsCount(data.controlValues?.skip as RQBJsonLogic);
  const {
    onNodeDragEnd,
    onNodeDragMove,
    onNodeDragStart,
    draggedNodeId,
    intersectingNodeId,
    forceUpdateNodesAndEdges,
    removeEdges,
  } = useDragContext();
  const id = props.id;
  const isAnyNodeDragging = draggedNodeId !== null;
  const areActionsVisible = !isAnyNodeDragging && isHovered && !data.isTemplateStorePreview && !!type;
  const isSelected =
    getIdFromSlug({ slug: stepSlug ?? '', divider: STEP_DIVIDER }) ===
      getIdFromSlug({ slug: data.stepSlug ?? '', divider: STEP_DIVIDER }) &&
    !!stepSlug &&
    !!data.stepSlug;
  const hasConditions = conditionsCount > 0;
  const isReadOnly =
    currentWorkflow?.origin === ResourceOriginEnum.EXTERNAL ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV;
  const isDraggable = !isReadOnly && !data.isTemplateStorePreview;

  const handleMouseEnter = () => {
    if (!isAnyNodeDragging) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleRemoveStep = useCallback(() => {
    if (!data.stepSlug || !currentWorkflow) {
      return;
    }

    update(
      {
        ...currentWorkflow,
        steps: currentWorkflow.steps.filter((s) => s.slug !== data.stepSlug),
      },
      {
        onSuccess: () => {
          if (currentEnvironment?.slug && currentWorkflow?.slug) {
            navigate(
              buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: currentEnvironment.slug,
                workflowSlug: currentWorkflow.slug,
              })
            );
          }
        },
      }
    );
  }, [data.stepSlug, currentWorkflow, currentEnvironment?.slug, update, navigate]);

  const handleCopyStep = useCallback(() => {
    if (!data.stepSlug || !currentWorkflow || !type) {
      return;
    }

    const currentStepIndex = currentWorkflow.steps.findIndex((s) => s.slug === data.stepSlug);

    if (currentStepIndex === -1) {
      return;
    }

    const currentStep = currentWorkflow.steps[currentStepIndex];

    // Create a new step by copying the current step structure
    const copiedStep: StepCreateDto = {
      name: `${currentStep.name} (Copy)`,
      type: currentStep.type,
      controlValues: { ...currentStep.controls.values },
    };

    // Insert the copied step immediately after the current step
    const newSteps = [...currentWorkflow.steps];
    newSteps.splice(currentStepIndex + 1, 0, copiedStep as any);

    update(
      {
        ...currentWorkflow,
        steps: newSteps,
      },
      {
        onSuccess: (updatedWorkflow) => {
          // Navigate to the newly created step
          const newStep = updatedWorkflow.steps[currentStepIndex + 1];

          if (newStep && currentEnvironment?.slug) {
            const isTemplateConfigurable = TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(type);

            if (isTemplateConfigurable) {
              navigate(
                buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                  stepSlug: newStep.slug,
                })
              );
            } else if (INLINE_CONFIGURABLE_STEP_TYPES.includes(type)) {
              navigate(
                buildRoute(ROUTES.EDIT_STEP, {
                  stepSlug: newStep.slug,
                })
              );
            }
          }
        },
      }
    );
  }, [data.stepSlug, currentWorkflow, type, currentEnvironment?.slug, update, navigate]);

  const handleEditContent = useCallback(() => {
    if (!data.stepSlug || !currentEnvironment?.slug || !type) {
      return;
    }

    const isTemplateConfigurable = TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(type);

    if (isTemplateConfigurable) {
      navigate(
        buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
          stepSlug: data.stepSlug,
        })
      );
    } else {
      navigate(
        buildRoute(ROUTES.EDIT_STEP, {
          stepSlug: data.stepSlug,
        })
      );
    }
  }, [data.stepSlug, currentEnvironment?.slug, navigate, type, currentWorkflow]);

  const handleNodeDragEnd = useCallback(() => {
    setIsHovered(false);
    onNodeDragEnd();
  }, [onNodeDragEnd]);

  return (
    <AnimatePresence>
      <motion.div
        layout
        layoutId={data.stepId} // should be a stable id for the animation
        className={cn('relative pt-1 pl-6 -ml-6')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLayoutAnimationStart={() => removeEdges()}
        onLayoutAnimationComplete={() => forceUpdateNodesAndEdges()}
      >
        <Node
          aria-selected={isSelected}
          className={cn(
            'group transition-all',
            {
              'pointer-events-none opacity-40': isAnyNodeDragging && id === draggedNodeId,
              'pointer-events-none scale-95 border border-dashed border-bg-soft bg-transparent aria-selected:[background-image:none]':
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

const NodeWrapper = ({ children, data, type }: { children: React.ReactNode; data: NodeData; type: StepTypeEnum }) => {
  if (data.isTemplateStorePreview) {
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
      data-testid={`${type}-node`}
    >
      {children}
    </Link>
  );
};

export const EmailNode = ({ id, data }: NodeProps<NodeType>) => {
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL];

  return (
    <NodeWrapper data={data} type={StepTypeEnum.EMAIL}>
      <StepNode id={id} data={data} type={StepTypeEnum.EMAIL}>
        <NodeHeader type={StepTypeEnum.EMAIL}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.EMAIL]}>
            <Icon />
          </NodeIcon>

          <NodeName>{data.name || 'Email Step'}</NodeName>
        </NodeHeader>

        <NodeBody
          type={StepTypeEnum.EMAIL}
          showPreview={data.isTemplateStorePreview}
          controlValues={data.controlValues ?? {}}
        >
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
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.SMS];

  return (
    <NodeWrapper data={data} type={StepTypeEnum.SMS}>
      <StepNode id={id} data={data} type={StepTypeEnum.SMS}>
        <NodeHeader type={StepTypeEnum.SMS}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.SMS]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'SMS Step'}</NodeName>
        </NodeHeader>
        <NodeBody
          showPreview={data.isTemplateStorePreview}
          type={StepTypeEnum.SMS}
          controlValues={data.controlValues ?? {}}
        >
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
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP];

  return (
    <NodeWrapper data={data} type={StepTypeEnum.IN_APP}>
      <StepNode id={id} data={data} type={StepTypeEnum.IN_APP}>
        <NodeHeader type={StepTypeEnum.IN_APP}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'In-App Step'}</NodeName>
        </NodeHeader>
        <NodeBody
          showPreview={data.isTemplateStorePreview}
          type={StepTypeEnum.IN_APP}
          controlValues={data.controlValues ?? {}}
        >
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
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.PUSH];

  return (
    <NodeWrapper data={data} type={StepTypeEnum.PUSH}>
      <StepNode id={id} data={data} type={StepTypeEnum.PUSH}>
        <NodeHeader type={StepTypeEnum.PUSH}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.PUSH]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Push Step'}</NodeName>
        </NodeHeader>
        <NodeBody
          showPreview={data.isTemplateStorePreview}
          type={StepTypeEnum.PUSH}
          controlValues={data.controlValues ?? {}}
        >
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
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CHAT];

  return (
    <NodeWrapper data={data} type={StepTypeEnum.CHAT}>
      <StepNode id={id} data={data} type={StepTypeEnum.CHAT}>
        <NodeHeader type={StepTypeEnum.CHAT}>
          <NodeIcon variant={STEP_TYPE_TO_COLOR[StepTypeEnum.CHAT]}>
            <Icon />
          </NodeIcon>
          <NodeName>{data.name || 'Chat Step'}</NodeName>
        </NodeHeader>
        <NodeBody
          showPreview={data.isTemplateStorePreview}
          type={StepTypeEnum.CHAT}
          controlValues={data.controlValues ?? {}}
        >
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
    <NodeWrapper data={data} type={StepTypeEnum.DELAY}>
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
    <NodeWrapper data={data} type={StepTypeEnum.DIGEST}>
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

export const CustomNode = (props: NodeProps<NodeType>) => {
  const { id, data } = props;
  const Icon = STEP_TYPE_TO_ICON[StepTypeEnum.CUSTOM];

  return (
    <NodeWrapper data={data} type={StepTypeEnum.CUSTOM}>
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
  const { intersectingNodeId } = useDragContext();
  const { id } = props;
  const isIntersecting = intersectingNodeId === id;
  const { workflow, update } = useWorkflow();
  const navigate = useNavigate();
  const has = useHasPermission();
  const { currentEnvironment } = useEnvironment();
  const { data: layoutsResponse, isFetching: isFetchingLayouts } = useFetchLayouts({
    limit: 100,
    refetchOnWindowFocus: false,
  });
  const defaultLayout = layoutsResponse?.layouts.find((layout) => layout.isDefault);
  const addDefaultLayout = !!defaultLayout;
  const defaultLayoutId = defaultLayout?.layoutId;

  if (!workflow || isFetchingLayouts) {
    return null;
  }

  const isReadOnly =
    workflow.origin === ResourceOriginEnum.EXTERNAL ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  if (isReadOnly) {
    return null;
  }

  return (
    <div
      className="flex cursor-pointer justify-center items-center"
      data-droppable-add-node-id={id}
      style={{ width: NODE_WIDTH, height: 32 }}
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
          visible
          className="-mt-1"
          onMenuItemClick={(stepType) => {
            update(
              {
                ...workflow,
                steps: [
                  ...workflow.steps,
                  createStep(stepType, addDefaultLayout ? defaultLayoutId : undefined, workflow.severity),
                ],
              },
              {
                onSuccess: (data) => {
                  if (TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(stepType)) {
                    if (currentEnvironment?.slug) {
                      navigate(
                        buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                          stepSlug: data.steps[data.steps.length - 1].slug,
                        })
                      );
                    } else {
                      navigate(
                        buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                          stepSlug: data.steps[data.steps.length - 1].slug,
                        })
                      );
                    }
                  } else if (INLINE_CONFIGURABLE_STEP_TYPES.includes(stepType)) {
                    navigate(
                      buildRoute(ROUTES.EDIT_STEP, {
                        stepSlug: data.steps[data.steps.length - 1].slug,
                      })
                    );
                  }
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
