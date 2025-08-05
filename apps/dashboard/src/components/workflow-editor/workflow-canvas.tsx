import { EnvironmentEnum, EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeProps,
  Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportHelperFunctionOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useUser } from '@clerk/clerk-react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineToast } from '@/components/primitives/inline-toast';
import { getFirstErrorMessage } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { generateUUID } from '@/utils/uuid';
import { NODE_HEIGHT, NODE_WIDTH } from './base-node';
import { AddNodeEdge, AddNodeEdgeType } from './edges';
import {
  AddNode,
  ChatNode,
  CustomNode,
  DelayNode,
  DigestNode,
  EmailNode,
  InAppNode,
  NodeData,
  PushNode,
  SmsNode,
  TriggerNode,
} from './nodes';
import { WorkflowChecklist } from './workflow-checklist';

const nodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  sms: SmsNode,
  in_app: InAppNode,
  push: PushNode,
  chat: ChatNode,
  delay: DelayNode,
  digest: DigestNode,
  custom: CustomNode,
  add: AddNode,
};

const DefaultEdge = ({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) => {
  return <BaseEdge key={id} id={id} path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} style={style} />;
};

const edgeTypes = {
  addNode: AddNodeEdge,
  default: DefaultEdge,
};

const panOnDrag = [1, 2];

// y distance = node height + space between nodes
const Y_DISTANCE = NODE_HEIGHT + 50;

function isIntersecting(el1: Element, el2: Element) {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();

  const reducedRect2 = {
    left: rect2.left,
    right: rect2.right,
    top: rect2.top,
    bottom: rect2.bottom,
  };

  return !(
    rect1.right < reducedRect2.left ||
    rect1.left > reducedRect2.right ||
    rect1.bottom < reducedRect2.top ||
    rect1.top > reducedRect2.bottom
  );
}

// Create a context for drag operations
interface DragContextType {
  onNodeDragStart: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDragMove: (position: { x: number; y: number }) => void;
  onNodeDragEnd: () => void;
  draggedNodeId: string | null;
  intersectingNodeId: string | null;
  intersectingEdgeId: string | null;
}

export const DragContext = createContext<DragContextType | null>(null);

export const useDragContext = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragContext.Provider');
  }
  return context;
};

const mapStepToNodeContent = (step: Step, workflowOrigin: ResourceOriginEnum): string | undefined => {
  const controlValues = step.controls.values;
  const delayMessage =
    workflowOrigin === ResourceOriginEnum.EXTERNAL
      ? 'Delay duration defined in code'
      : `Delay for ${controlValues.amount} ${controlValues.unit}`;

  switch (step.type) {
    case StepTypeEnum.TRIGGER:
      return 'This step triggers this workflow';
    case StepTypeEnum.EMAIL:
      return 'Sends Email to your subscribers';
    case StepTypeEnum.SMS:
      return 'Sends SMS to your subscribers';
    case StepTypeEnum.IN_APP:
      return 'Sends In-App notification to your subscribers';
    case StepTypeEnum.PUSH:
      return 'Sends Push notification to your subscribers';
    case StepTypeEnum.CHAT:
      return 'Sends Chat message to your subscribers';
    case StepTypeEnum.DELAY:
      return delayMessage;
    case StepTypeEnum.DIGEST:
      return 'Batches events into one coherent message before delivery to the subscriber.';
    case StepTypeEnum.CUSTOM:
      return 'Executes the business logic in your bridge application';
    default:
      return undefined;
  }
};

const mapStepToNode = ({
  addStepIndex,
  previousPosition,
  step,
  workflowOrigin = ResourceOriginEnum.NOVU_CLOUD,
  isTemplateStorePreview,
}: {
  addStepIndex: number;
  previousPosition: { x: number; y: number };
  step: Step;
  workflowOrigin?: ResourceOriginEnum;
  isTemplateStorePreview?: boolean;
}): Node<NodeData, keyof typeof nodeTypes> => {
  const content = mapStepToNodeContent(step, workflowOrigin);

  const error = step.issues
    ? getFirstErrorMessage(step.issues, 'controls') || getFirstErrorMessage(step.issues, 'integration')
    : undefined;

  return {
    id: step._id,
    position: { x: previousPosition.x, y: previousPosition.y + Y_DISTANCE },
    data: {
      id: step._id,
      name: step.name,
      content,
      addStepIndex,
      stepSlug: step.slug,
      error: error?.message,
      controlValues: step.controls.values,
      isTemplateStorePreview,
    },
    type: step.type,
  };
};

const WorkflowCanvasChild = ({
  steps,
  isTemplateStorePreview,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { currentEnvironment } = useEnvironment();
  const { workflow: currentWorkflow, update } = useWorkflow();
  const navigate = useNavigate();
  const { user } = useUser();
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [intersectingNodeId, setIntersectingNodeId] = useState<string | null>(null);
  const [intersectingEdgeId, setIntersectingEdgeId] = useState<string | null>(null);

  const [nodes, edges] = useMemo(() => {
    console.log('nodes, edges re-render');
    const id = generateUUID();
    const triggerNode: Node<NodeData, 'trigger'> = {
      id,
      position: { x: 0, y: 0 },
      data: {
        id,
        workflowSlug: currentWorkflow?.slug ?? '',
        environment: currentEnvironment?.slug ?? '',
        isTemplateStorePreview,
      },
      type: 'trigger',
    };
    let previousPosition = triggerNode.position;

    const createdNodes = steps?.map((step, index) => {
      const node = mapStepToNode({
        step,
        previousPosition,
        addStepIndex: index,
        workflowOrigin: currentWorkflow?.origin,
        isTemplateStorePreview,
      });
      previousPosition = node.position;
      return node;
    });

    let allNodes: Node<NodeData, keyof typeof nodeTypes>[] = [triggerNode, ...createdNodes];

    const addNodeId = generateUUID();
    const addNode: Node<NodeData, 'add'> = {
      id: addNodeId,
      position: { ...previousPosition, y: previousPosition.y + Y_DISTANCE },
      data: {
        id: addNodeId,
      },
      type: 'add',
    };
    allNodes = [...allNodes, addNode];

    const edges = allNodes.reduce<AddNodeEdgeType[]>((acc, node, index) => {
      if (index === 0) {
        return acc;
      }

      const parent = allNodes[index - 1];

      acc.push({
        id: `edge-${parent.id}-${node.id}`,
        source: parent.id,
        sourceHandle: 'b',
        targetHandle: 'a',
        target: node.id,
        type: isTemplateStorePreview ? 'default' : 'addNode',
        style: {
          stroke: 'hsl(var(--neutral-alpha-200))',
          strokeWidth: 2,
          strokeDasharray: 5,
        },
        data: isTemplateStorePreview
          ? undefined
          : {
              isLast: index === allNodes.length - 1,
              addStepIndex: index - 1,
            },
      });

      return acc;
    }, []);

    return [allNodes, edges];
  }, [steps, currentWorkflow?.slug, currentEnvironment?.slug, isTemplateStorePreview, currentWorkflow?.origin]);

  const handleNodeDragStart = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type === 'trigger' || node.type === 'add') return;

      setDraggedNodeId(nodeId);
    },
    [nodes]
  );

  const handleNodeDragMove = useCallback(() => {
    let foundNodeIntersection = false;
    const draggableNode = document.querySelector(`[data-draggable-node-id="${draggedNodeId}"]`);
    if (!draggableNode) return;

    for (const node of nodes) {
      if (node.id === draggedNodeId || node.type === 'trigger') continue;

      const currentNode = document.querySelector(`[data-droppable-node-id="${node.id}"]`);
      if (!currentNode) continue;

      if (isIntersecting(currentNode, draggableNode)) {
        setIntersectingNodeId(node.id);
        setIntersectingEdgeId(null);
        foundNodeIntersection = true;
        break;
      }
    }

    // add node is created at the end of the nodes array that's why we need to check the last node
    const addNode = document.querySelector(`[data-droppable-add-node-id]`);
    // -2 because the last node is the add node
    const isLastNode = nodes[nodes.length - 2].id === draggedNodeId;
    if (addNode && isIntersecting(addNode, draggableNode) && !isLastNode) {
      setIntersectingNodeId(addNode.getAttribute('data-droppable-add-node-id') ?? null);
      setIntersectingEdgeId(null);
      foundNodeIntersection = true;
    }

    let foundEdgeIntersection = false;
    for (const edge of edges) {
      // Skip if it's the currently intersecting edge or a default edge
      if (edge.type === 'default') continue;

      // Skip if this edge is connected to the dragged node (top or bottom)
      if (edge.source === draggedNodeId || edge.target === draggedNodeId) continue;

      // Get the source and target nodes of the edge
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const edgeNode = document.querySelector(`[data-droppable-edge-id="${edge.id}"]`);
      if (!edgeNode) continue;

      if (isIntersecting(edgeNode, draggableNode)) {
        setIntersectingEdgeId(edge.id);
        setIntersectingNodeId(null);
        foundEdgeIntersection = true;
      }
    }

    if (!foundNodeIntersection) {
      setIntersectingNodeId(null);
    }

    if (!foundEdgeIntersection) {
      setIntersectingEdgeId(null);
    }
  }, [nodes, draggedNodeId, reactFlowInstance, edges, intersectingEdgeId]);

  const handleNodeDragEnd = useCallback(() => {
    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    const steps = [...(currentWorkflow?.steps ?? [])];
    const draggedStepIndex = steps.findIndex((s) => s.slug === draggedNode?.data.stepSlug);

    if (!currentWorkflow || !draggedNode || !draggedNode.data.stepSlug || draggedStepIndex === -1) {
      setDraggedNodeId(null);
      setIntersectingNodeId(null);
      setIntersectingEdgeId(null);
      return;
    }

    const isLastAddNode = nodes[nodes.length - 1].id === intersectingNodeId;
    if (intersectingNodeId && !isLastAddNode) {
      const hoveredNode = nodes.find((n) => n.id === intersectingNodeId);
      if (hoveredNode?.data.stepSlug) {
        const hoveredStepIndex = steps.findIndex((s) => s.slug === hoveredNode.data.stepSlug);

        if (hoveredStepIndex !== -1 && hoveredStepIndex !== draggedStepIndex) {
          const newSteps = [...steps];
          // Swap the items
          [newSteps[draggedStepIndex], newSteps[hoveredStepIndex]] = [
            newSteps[hoveredStepIndex],
            newSteps[draggedStepIndex],
          ];

          update({
            ...currentWorkflow,
            steps: newSteps,
          });
        }
      }
    } else if (intersectingNodeId && isLastAddNode) {
      const newSteps = [...steps];
      const draggedNodeIndex = nodes.findIndex((n) => n.id === draggedNodeId) - 1; // -1 because the add node is not a step

      const [temp] = newSteps.splice(draggedNodeIndex, 1);
      newSteps.push(temp);

      update({
        ...currentWorkflow,
        steps: newSteps,
      });
    }

    if (intersectingEdgeId) {
      const hoveredEdge = edges.find((e) => e.id === intersectingEdgeId);
      if (hoveredEdge) {
        // Find the source and target nodes of the edge
        const sourceNode = nodes.find((n) => n.id === hoveredEdge.source);
        const targetNode = nodes.find((n) => n.id === hoveredEdge.target);

        // Find indices in steps array
        const sourceStepIndex = sourceNode?.data.stepSlug
          ? steps.findIndex((s) => s.slug === sourceNode.data.stepSlug)
          : -1;
        const targetStepIndex = targetNode?.data.stepSlug
          ? steps.findIndex((s) => s.slug === targetNode.data.stepSlug)
          : -1;

        // If source is trigger node, insert at beginning
        const insertIndex =
          sourceNode?.type === 'trigger' ? 0 : sourceStepIndex !== -1 ? sourceStepIndex + 1 : targetStepIndex;

        if (insertIndex !== -1 && draggedStepIndex !== insertIndex) {
          const newSteps = [...steps];
          const [draggedStep] = newSteps.splice(draggedStepIndex, 1);

          // Adjust insert index if we removed an item before it
          const adjustedInsertIndex = draggedStepIndex < insertIndex ? insertIndex - 1 : insertIndex;

          newSteps.splice(adjustedInsertIndex, 0, draggedStep);

          update({
            ...currentWorkflow,
            steps: newSteps,
          });
        }
      }
    }

    setDraggedNodeId(null);
    setIntersectingNodeId(null);
    setIntersectingEdgeId(null);
  }, [draggedNodeId, currentWorkflow, nodes, intersectingNodeId, intersectingEdgeId, edges, update]);

  const positionCanvas = useCallback(
    (options?: ViewportHelperFunctionOptions) => {
      const clientWidth = reactFlowWrapper.current?.clientWidth;
      const middle = clientWidth ? clientWidth / 2 - NODE_WIDTH / 2 : 0;

      reactFlowInstance.setViewport({ x: middle, y: 50, zoom: 0.99 }, options);
    },
    [reactFlowInstance]
  );

  useEffect(() => {
    const listener = () => positionCanvas({ duration: 300 });

    window.addEventListener('resize', listener);

    return () => {
      window.removeEventListener('resize', listener);
    };
  }, [positionCanvas]);

  useLayoutEffect(() => {
    positionCanvas();
  }, [positionCanvas]);

  const dragContextValue = useMemo(() => {
    return {
      onNodeDragStart: handleNodeDragStart,
      onNodeDragMove: handleNodeDragMove,
      onNodeDragEnd: handleNodeDragEnd,
      draggedNodeId,
      intersectingNodeId,
      intersectingEdgeId,
    };
  }, [
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
  ]);

  return (
    <DragContext.Provider value={dragContextValue}>
      <div ref={reactFlowWrapper} className="h-full w-full" id="workflow-canvas-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={null}
          maxZoom={1}
          minZoom={0.9}
          panOnScroll
          selectionOnDrag
          panOnDrag={panOnDrag}
          nodesDraggable={false}
          nodesConnectable={false}
          onPaneClick={() => {
            if (isTemplateStorePreview) {
              return;
            }

            // unselect node if clicked on background
            if (currentEnvironment?.slug && currentWorkflow?.slug) {
              navigate(
                buildRoute(ROUTES.EDIT_WORKFLOW, {
                  environmentSlug: currentEnvironment.slug,
                  workflowSlug: currentWorkflow.slug,
                })
              );
            }
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} className="!bg-bg-weak" />
        </ReactFlow>

        {currentWorkflow &&
          currentEnvironment?.name === EnvironmentEnum.DEVELOPMENT &&
          currentWorkflow.origin === ResourceOriginEnum.NOVU_CLOUD &&
          !user?.unsafeMetadata?.workflowChecklistCompleted && (
            <WorkflowChecklist steps={steps} workflow={currentWorkflow} />
          )}
      </div>
    </DragContext.Provider>
  );
};

export const WorkflowCanvas = ({
  steps,
  isTemplateStorePreview,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
}) => {
  const has = useHasPermission();
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const { workflow: currentWorkflow } = useWorkflow();
  const navigate = useNavigate();
  const hasPermission = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const showReadOnlyOverlay = !hasPermission || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  const handleSwitchToDevelopment = () => {
    const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

    if (developmentEnvironment?.slug && currentWorkflow?.workflowId) {
      switchEnvironment(developmentEnvironment.slug);
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: developmentEnvironment.slug,
          workflowSlug: currentWorkflow.workflowId,
        })
      );
    }
  };

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <WorkflowCanvasChild steps={steps || []} isTemplateStorePreview={isTemplateStorePreview} />

        {showReadOnlyOverlay && (
          <>
            <div
              className="border-warning/20 pointer-events-none absolute inset-x-0 top-0 border-t-[0.5px]"
              style={{
                position: 'absolute',
                height: '100%',
                background: 'linear-gradient(to bottom, hsl(var(--warning) / 0.08), transparent 4%)',
                transition: 'border 0.3s ease-in-out, background 0.3s ease-in-out',
              }}
            />
            <div className="absolute left-4 top-4 z-50">
              <InlineToast
                className="bg-warning/10 border shadow-md"
                variant={'warning'}
                description={
                  hasPermission && currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                    ? 'Edit the workflow in your development environment.'
                    : 'Content visible but locked for editing. Contact an admin for edit access.'
                }
                title="View-only:"
                ctaLabel={
                  hasPermission && currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                    ? 'Switch environment'
                    : undefined
                }
                onCtaClick={handleSwitchToDevelopment}
              />
            </div>
          </>
        )}
      </div>
    </ReactFlowProvider>
  );
};
