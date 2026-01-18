import { ResourceOriginEnum, StepCreateDto, WorkflowResponseDto } from '@novu/shared';
import { Node, ReactFlowInstance, useEdgesState, useNodesState } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { INLINE_CONFIGURABLE_STEP_TYPES, STEP_TYPE_LABELS, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { getIdFromSlug, STEP_DIVIDER } from '@/utils/id-utils';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { generateUUID } from '@/utils/uuid';
import { AddNodeEdgeType } from './edges';
import {
  createAddNode,
  createEdges,
  createNode,
  createTriggerNode,
  mapStepToNode,
  mapStepToNodeContent,
  NODE_TYPE_TO_STEP_TYPE,
  nodeTypes,
  recalculatePositionAndIndex,
} from './node-utils';
import { NodeData } from './nodes';
import { createStep } from './step-utils';
import { showErrorToast } from './toasts';
import { useWorkflow } from './workflow-provider';

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

export const useCanvasNodesEdges = ({
  steps: currentSteps,
  showStepPreview: currentShowStepPreview,
  reactFlowInstance: currentReactFlowInstance,
  reactFlowWrapper,
}: {
  steps: Step[];
  showStepPreview?: boolean;
  reactFlowInstance: ReactFlowInstance;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
}) => {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { workflow: currentWorkflow, step: currentStep, update } = useWorkflow();
  const { data: layoutsResponse } = useFetchLayouts({
    limit: 100,
    refetchOnWindowFocus: false,
  });
  // to have a nice animation in the workflow canvas, we need to store the nodes and edges in the state and perform the updates on the state
  const [currentNodes, setNodes] = useNodesState<Node<NodeData, keyof typeof nodeTypes>>([]);
  const [currentEdges, setEdges] = useEdgesState<AddNodeEdgeType>([]);
  const [currentSelectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [intersectingNodeId, setIntersectingNodeId] = useState<string | null>(null);
  const [intersectingEdgeId, setIntersectingEdgeId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useDataRef({
    step: currentStep,
    reactFlowInstance: currentReactFlowInstance,
    selectedNodeId: currentSelectedNodeId,
    environment: currentEnvironment,
    workflow: currentWorkflow,
    nodes: currentNodes,
    edges: currentEdges,
    isTemplateStorePreview: currentShowStepPreview ?? false,
    containerWidth: reactFlowWrapper.current?.clientWidth ?? 0,
    steps: currentSteps,
  });

  const updateEdges = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setEdges(createEdges(dataRef.current.nodes, dataRef.current.isTemplateStorePreview));
      timeoutRef.current = null;
    }, 150);
  }, [dataRef, setEdges]);

  const removeEdges = useCallback(() => {
    setEdges([]);
  }, [setEdges]);

  const insertStep = useCallback(
    (
      insertIndex: number,
      insertNode: Node<NodeData, keyof typeof nodeTypes>,
      insertStep: StepCreateDto,
      options?: { onSuccess?: () => void; onError?: () => void }
    ) => {
      const workflow = dataRef.current.workflow;
      const environment = dataRef.current.environment;
      const nodes = dataRef.current.nodes;
      if (!workflow || !environment || insertIndex < 0 || insertIndex >= nodes.length) return;

      const oldNodes = [...nodes];
      const stepNodes = nodes.filter((node) => node.type !== 'trigger' && node.type !== 'add');

      const updatedNodes = [
        nodes.find((node) => node.type === 'trigger'),
        ...stepNodes.slice(0, insertIndex).map((step) => ({
          ...step,
        })),
        insertNode,
        ...stepNodes.slice(insertIndex).map((step) => ({
          ...step,
        })),
        nodes.find((node) => node.type === 'add'),
      ].filter((node) => node !== undefined);

      setNodes(recalculatePositionAndIndex(updatedNodes, dataRef.current.containerWidth));

      const updatedSteps = [
        ...workflow.steps.slice(0, insertIndex).map((step) => ({
          _id: step._id,
          stepId: step.stepId,
          name: step.name,
          type: step.type,
          controlValues: step.controlValues,
        })),
        insertStep,
        ...workflow.steps.slice(insertIndex).map((step) => ({
          _id: step._id,
          stepId: step.stepId,
          name: step.name,
          type: step.type,
          controlValues: step.controlValues,
        })),
      ];

      update(
        {
          ...workflow,
          steps: updatedSteps,
        },
        {
          onSuccess: (newWorkflow) => {
            const insertedStepIndex = updatedSteps.indexOf(insertStep);
            const newStep = newWorkflow.steps[insertedStepIndex];
            const insertedNodeIndex = updatedNodes.indexOf(insertNode);

            setSelectedNodeId(insertNode.id);

            setNodes(
              recalculatePositionAndIndex(
                updatedNodes.map((node, index) => {
                  if (index === insertedNodeIndex) {
                    const { data: newNodeData } = mapStepToNode({
                      step: newStep,
                      previousPosition: { x: 0, y: 0 },
                      index: insertedNodeIndex,
                    });

                    // preserve the id of the node to reduce the re-render of the nodes and blinking
                    return { ...node, data: newNodeData };
                  }
                  return { ...node, data: { ...node.data, isPending: false } };
                }),
                dataRef.current.containerWidth
              )
            );

            // navigate to the step editor
            if (newStep && environment?.slug) {
              const isTemplateConfigurable = TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(newStep.type);

              if (isTemplateConfigurable) {
                navigate(
                  buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                    stepSlug: newStep.slug,
                  })
                );
              } else if (INLINE_CONFIGURABLE_STEP_TYPES.includes(newStep.type)) {
                navigate(
                  buildRoute(ROUTES.EDIT_STEP, {
                    stepSlug: newStep.slug,
                  })
                );
              }
            }
          },
          onError: () => {
            options?.onError?.();
            setNodes(recalculatePositionAndIndex(oldNodes, dataRef.current.containerWidth));
          },
        }
      );
    },
    [setNodes, navigate, update, dataRef]
  );

  const addNode = useCallback(
    (insertIndex: number, type: keyof typeof NODE_TYPE_TO_STEP_TYPE) => {
      const workflow = dataRef.current.workflow;
      if (!workflow) return;

      const defaultLayout = layoutsResponse?.layouts.find((layout) => layout.isDefault);
      const addDefaultLayout = !!defaultLayout;
      const defaultLayoutId = defaultLayout?.layoutId;

      const stepType = NODE_TYPE_TO_STEP_TYPE[type];
      const newStep = createStep(stepType, addDefaultLayout ? defaultLayoutId : undefined, workflow.severity);
      const newNode = createNode({
        x: 0,
        y: 0,
        name: `${STEP_TYPE_LABELS[stepType]} Step`,
        content: mapStepToNodeContent(stepType, newStep.controlValues ?? {}, ResourceOriginEnum.NOVU_CLOUD),
        index: insertIndex,
        stepSlug: '_st_',
        error: '',
        controlValues: newStep.controlValues ?? {},
        isPending: true,
        type: stepType,
      });

      insertStep(insertIndex, newNode, newStep, {
        onError: () => {
          showErrorToast('Failed to add node');
        },
      });
    },
    [insertStep, layoutsResponse, dataRef]
  );

  const copyNode = useCallback(
    (copyIndex: number) => {
      const workflow = dataRef.current.workflow;
      const nodes = dataRef.current.nodes;
      if (!workflow || copyIndex < 0 || copyIndex >= nodes.length) return;

      const node = nodes[copyIndex];
      const copyNode = {
        ...node,
        id: generateUUID(),
        data: { ...node.data, name: `${node.data.name} (Copy)`, isPending: true },
      };

      const currentStep = workflow.steps.find((step) => step.slug === copyNode.data.stepSlug);
      if (!currentStep) return;

      // Create a new step by copying the current step structure
      const copiedStep: StepCreateDto = {
        name: `${currentStep.name} (Copy)`,
        type: currentStep.type,
        controlValues: { ...currentStep.controls.values },
      };

      insertStep(copyIndex, copyNode, copiedStep, {
        onError: () => {
          showErrorToast('Failed to copy node');
        },
      });
    },
    [insertStep, dataRef]
  );

  const removeNode = useCallback(
    (removeIndex: number, options?: { onSuccess?: () => void; onError?: () => void }) => {
      const workflow = dataRef.current.workflow;
      const environment = dataRef.current.environment;
      const nodes = dataRef.current.nodes;
      const selectedNodeId = dataRef.current.selectedNodeId;
      if (!workflow || !environment || removeIndex < 0 || removeIndex >= nodes.length) return;

      const oldNodes = [...nodes];
      const nodeToRemove = nodes[removeIndex];

      update(
        {
          ...workflow,
          steps: workflow.steps.filter((s) => s.slug !== nodeToRemove.data.stepSlug),
        },
        {
          onSuccess: () => {
            const newNodes = [...dataRef.current.nodes].filter((node) => node.id !== nodeToRemove.id);
            setNodes(recalculatePositionAndIndex(newNodes, dataRef.current.containerWidth));
            updateEdges();
            options?.onSuccess?.();

            // navigate to the workflow editor
            if (selectedNodeId === nodeToRemove.id && environment?.slug && workflow?.slug) {
              navigate(
                buildRoute(ROUTES.EDIT_WORKFLOW, {
                  environmentSlug: environment.slug,
                  workflowSlug: workflow.slug,
                })
              );
              setSelectedNodeId(undefined);
            }
          },
          onError: () => {
            showErrorToast('Failed to remove node');
            options?.onError?.();
            setNodes(recalculatePositionAndIndex(oldNodes, dataRef.current.containerWidth));
          },
        }
      );
    },
    [setNodes, dataRef, navigate, update, updateEdges]
  );

  const reorderSteps = useCallback(
    (
      newNodes: Node<NodeData, keyof typeof nodeTypes>[],
      newSteps: WorkflowResponseDto['steps'],
      options?: { onSuccess?: () => void; onError?: () => void }
    ) => {
      const step = dataRef.current.step;
      const workflow = dataRef.current.workflow;
      const nodes = dataRef.current.nodes;
      if (!workflow) return;

      const oldNodes = [...nodes];

      const selectedNode = newNodes.find(
        (node) =>
          getIdFromSlug({ slug: step?.slug ?? '', divider: STEP_DIVIDER }) ===
          getIdFromSlug({ slug: node.data.stepSlug ?? '', divider: STEP_DIVIDER })
      );
      if (selectedNode) {
        setSelectedNodeId(selectedNode.id);
      }
      setNodes(recalculatePositionAndIndex(newNodes, dataRef.current.containerWidth));
      removeEdges();

      update(
        {
          ...workflow,
          steps: newSteps,
        },
        {
          onSuccess: () => {
            const finalNodes = recalculatePositionAndIndex(
              newNodes.map((node) => ({ ...node, data: { ...node.data, isPending: false } })),
              dataRef.current.containerWidth
            );

            setNodes(finalNodes);
            updateEdges();
            const reactFlowInstance = dataRef.current.reactFlowInstance;
            // force updating the ids to regenerate the edges
            for (const node of finalNodes) {
              reactFlowInstance.updateNode(node.id, {
                id: generateUUID(),
              });
            }
            options?.onSuccess?.();
          },
          onError: () => {
            showErrorToast('Failed to reorder nodes');
            options?.onError?.();
            setNodes(recalculatePositionAndIndex(oldNodes, dataRef.current.containerWidth));
            updateEdges();
          },
        }
      );
    },
    [setNodes, updateEdges, removeEdges, dataRef, update]
  );

  const handleNodeDragStart = useCallback(
    (nodeId: string) => {
      const nodes = dataRef.current.nodes;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type === 'trigger' || node.type === 'add') return;

      setDraggedNodeId(nodeId);
    },
    [dataRef]
  );

  const handleNodeDragMove = useCallback(() => {
    let foundNodeIntersection = false;
    const nodes = dataRef.current.nodes;
    const edges = dataRef.current.edges;
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

    // if the node is intersecting with another node, we don't need to check the edges intersection
    if (foundNodeIntersection) {
      return;
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
  }, [draggedNodeId, dataRef]);

  const handleNodeDragEnd = useCallback(() => {
    const nodes = dataRef.current.nodes;
    const edges = dataRef.current.edges;
    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    const workflow = dataRef.current.workflow;
    const steps = [...(workflow?.steps ?? [])];
    const draggedStepIndex = steps.findIndex(
      (s) =>
        getIdFromSlug({ slug: s.slug, divider: STEP_DIVIDER }) ===
        getIdFromSlug({ slug: draggedNode?.data.stepSlug ?? '', divider: STEP_DIVIDER })
    );
    const draggedNodeIndex = nodes.findIndex((n) => n.id === draggedNodeId);

    if (!workflow || !draggedNode || !draggedNode.data.stepSlug || draggedStepIndex === -1) {
      setDraggedNodeId(null);
      setIntersectingNodeId(null);
      setIntersectingEdgeId(null);
      return;
    }

    const isLastAddNode = nodes[nodes.length - 1].id === intersectingNodeId;
    if (intersectingNodeId && !isLastAddNode) {
      const hoveredNode = nodes.find((n) => n.id === intersectingNodeId);
      if (hoveredNode?.data.stepSlug) {
        const hoveredStepIndex = steps.findIndex(
          (s) =>
            getIdFromSlug({ slug: s.slug, divider: STEP_DIVIDER }) ===
            getIdFromSlug({ slug: hoveredNode.data.stepSlug ?? '', divider: STEP_DIVIDER })
        );
        const hoveredNodeIndex = nodes.findIndex((n) => n.id === intersectingNodeId);

        if (hoveredStepIndex !== -1 && hoveredStepIndex !== draggedStepIndex) {
          // Swap the steps
          const newSteps = [...steps];
          const draggedStep = newSteps[draggedStepIndex];
          const hoveredStep = newSteps[hoveredStepIndex];
          newSteps[draggedStepIndex] = hoveredStep;
          newSteps[hoveredStepIndex] = draggedStep;

          // Swap the nodes
          const newNodes = [...nodes];
          const draggedNode = newNodes[draggedNodeIndex];
          const hoveredNode = newNodes[hoveredNodeIndex];
          newNodes[draggedNodeIndex] = { ...hoveredNode, data: { ...hoveredNode.data, isPending: true } };
          newNodes[hoveredNodeIndex] = { ...draggedNode, data: { ...draggedNode.data, isPending: true } };

          reorderSteps(newNodes, newSteps);
        }
      }
    } else if (intersectingNodeId && isLastAddNode) {
      const newSteps = [...steps];
      const newNodes = [...nodes];

      const [tempStep] = newSteps.splice(draggedStepIndex, 1);
      newSteps.push(tempStep);

      const addNode = newNodes.pop();
      const [tempNode] = newNodes.splice(draggedNodeIndex, 1);
      newNodes.push({ ...tempNode, data: { ...tempNode.data, isPending: true } });
      if (addNode) {
        newNodes.push(addNode);
      }

      reorderSteps(newNodes, newSteps);
    }

    if (intersectingEdgeId) {
      const hoveredEdge = edges.find((e) => e.id === intersectingEdgeId);
      if (hoveredEdge) {
        // Find the source and target nodes of the edge
        const sourceNode = nodes.find((n) => n.id === hoveredEdge.source);
        const targetNode = nodes.find((n) => n.id === hoveredEdge.target);
        const sourceNodeIndex = nodes.findIndex((n) => n.id === hoveredEdge.source);
        const targetNodeIndex = nodes.findIndex((n) => n.id === hoveredEdge.target);

        // Find indices in steps array
        const sourceStepIndex = sourceNode?.data.stepSlug
          ? steps.findIndex(
              (s) =>
                getIdFromSlug({ slug: s.slug, divider: STEP_DIVIDER }) ===
                getIdFromSlug({ slug: sourceNode.data.stepSlug ?? '', divider: STEP_DIVIDER })
            )
          : -1;
        const targetStepIndex = targetNode?.data.stepSlug
          ? steps.findIndex(
              (s) =>
                getIdFromSlug({ slug: s.slug, divider: STEP_DIVIDER }) ===
                getIdFromSlug({ slug: targetNode.data.stepSlug ?? '', divider: STEP_DIVIDER })
            )
          : -1;

        // If source is trigger node, insert at beginning
        const insertStepIndex =
          sourceNode?.type === 'trigger' ? 0 : sourceStepIndex !== -1 ? sourceStepIndex + 1 : targetStepIndex;
        const insertNodeIndex =
          sourceNode?.type === 'trigger' ? 1 : sourceNodeIndex !== -1 ? sourceNodeIndex + 1 : targetNodeIndex;

        if (insertNodeIndex !== -1 && draggedNodeIndex !== insertNodeIndex) {
          // Adjust insert index if we removed an item before it
          const adjustedInsertStepIndex = draggedStepIndex < insertStepIndex ? insertStepIndex - 1 : insertStepIndex;
          const adjustedInsertNodeIndex = draggedNodeIndex < insertNodeIndex ? insertNodeIndex - 1 : insertNodeIndex;

          const newSteps = [...steps];
          const [draggedStep] = newSteps.splice(draggedStepIndex, 1);
          newSteps.splice(adjustedInsertStepIndex, 0, draggedStep);

          const newNodes = [...nodes];
          const [draggedNode] = newNodes.splice(draggedNodeIndex, 1);
          newNodes.splice(adjustedInsertNodeIndex, 0, {
            ...draggedNode,
            data: { ...draggedNode.data, isPending: true },
          });

          reorderSteps(newNodes, newSteps);
        }
      }
    }

    setDraggedNodeId(null);
    setIntersectingNodeId(null);
    setIntersectingEdgeId(null);
  }, [draggedNodeId, dataRef, intersectingNodeId, intersectingEdgeId, reorderSteps]);

  const selectNode = useCallback(
    (id: string, goto: 'editor' | 'view' = 'editor') => {
      const nodes = dataRef.current.nodes;
      const potentialNode = nodes.find((n) => n.id === id);
      if (potentialNode) {
        setSelectedNodeId(id);
      }

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (goto === 'editor') {
        const isTemplateConfigurable = TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(
          NODE_TYPE_TO_STEP_TYPE[potentialNode?.type as keyof typeof NODE_TYPE_TO_STEP_TYPE]
        );
        if (isTemplateConfigurable) {
          navigate(
            buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
              stepSlug: potentialNode?.data?.stepSlug ?? '',
            })
          );
        } else {
          navigate(
            buildRoute(ROUTES.EDIT_STEP, {
              stepSlug: potentialNode?.data?.stepSlug ?? '',
            })
          );
        }
        return;
      }

      const timeout = setTimeout(() => {
        navigate(buildRoute(ROUTES.EDIT_STEP, { stepSlug: potentialNode?.data?.stepSlug ?? '' }));
        clickTimeoutRef.current = null;
      }, 150);

      clickTimeoutRef.current = timeout;
    },
    [dataRef, navigate]
  );

  const unselectNode = useCallback(() => {
    setSelectedNodeId(undefined);
  }, []);

  useEffect(() => {
    // handle workflow/step updates from the server with a slight delay to
    // get the latest nodes and edges changes in state first
    // the steps can be updated or deleted outside of the workflow canvas, so we need to handle that
    const timeout = setTimeout(() => {
      const steps = currentWorkflow?.steps ?? dataRef.current.steps;

      const nodes = dataRef.current.nodes;
      const step = dataRef.current.step;
      const containerWidth = dataRef.current.containerWidth;
      const currentEnvironment = dataRef.current.environment;

      const newNodes = steps.map((step) => {
        const foundNode = nodes.find(
          (node) =>
            getIdFromSlug({ slug: step.slug, divider: STEP_DIVIDER }) ===
            getIdFromSlug({ slug: node.data.stepSlug ?? '', divider: STEP_DIVIDER })
        );

        const newNode = mapStepToNode({
          step,
          previousPosition: foundNode?.position ?? { x: 0, y: 0 },
          index: foundNode?.data.index ?? 0,
        });

        if (foundNode) {
          return { ...foundNode, data: newNode.data };
        }

        return newNode;
      });
      const triggerNode =
        nodes.find((node) => node.type === 'trigger') ??
        createTriggerNode(currentWorkflow, currentEnvironment, containerWidth);
      const previousPosition = newNodes[newNodes.length - 1]?.position ?? triggerNode.position;
      const addNode = nodes.find((node) => node.type === 'add') ?? createAddNode(previousPosition, newNodes);
      const finalNodes = [triggerNode, ...newNodes, addNode].filter((node) => node !== undefined);
      const finalSelectedNode = finalNodes.find(
        (node) =>
          getIdFromSlug({ slug: step?.slug ?? '', divider: STEP_DIVIDER }) ===
          getIdFromSlug({ slug: node.data.stepSlug ?? '', divider: STEP_DIVIDER })
      );
      if (step && finalSelectedNode) {
        setSelectedNodeId(finalSelectedNode.id);
      }
      setNodes(recalculatePositionAndIndex(finalNodes, dataRef.current.containerWidth));
      updateEdges();
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [dataRef, currentWorkflow, setNodes, updateEdges]);

  return {
    selectedNodeId: currentSelectedNodeId,
    selectNode,
    unselectNode,
    nodes: currentNodes,
    edges: currentEdges,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
    removeEdges,
    updateEdges,
    onNodeDragStart: handleNodeDragStart,
    onNodeDragMove: handleNodeDragMove,
    onNodeDragEnd: handleNodeDragEnd,
    copyNode,
    addNode,
    removeNode,
  };
};
