import { ResourceOriginEnum, UpdateWorkflowDto, WorkflowResponseDto } from '@novu/shared';
import { useEdgesState, useNodesState } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import { Step } from '@/utils/types';
import { generateNodesAndEdges } from './node-utils';
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
  steps,
  isTemplateStorePreview,
  workflow: passedWorkflow,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
  workflow?: WorkflowResponseDto;
}) => {
  const { currentEnvironment } = useEnvironment();
  const { workflow: currentWorkflow, optimisticReorderSteps, update } = useWorkflow();
  const workflow = passedWorkflow || currentWorkflow;
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return generateNodesAndEdges(steps, isTemplateStorePreview ?? false, workflow, currentEnvironment);
  }, [steps, isTemplateStorePreview, workflow, currentEnvironment]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [intersectingNodeId, setIntersectingNodeId] = useState<string | null>(null);
  const [intersectingEdgeId, setIntersectingEdgeId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const forceUpdateNodesAndEdges = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const { nodes, edges } = generateNodesAndEdges(
        steps,
        isTemplateStorePreview ?? false,
        workflow,
        currentEnvironment
      );
      setNodes(nodes);
      setEdges(edges);
      timeoutRef.current = null;
    }, 100);
  }, [steps, workflow, currentEnvironment, isTemplateStorePreview, setNodes, setEdges]);

  const removeEdges = useCallback(() => {
    setEdges([]);
  }, [setEdges]);

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
  }, [nodes, draggedNodeId, edges]);

  const handleNodeDragEnd = useCallback(() => {
    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    const steps = [...(workflow?.steps ?? [])];
    const draggedStepIndex = steps.findIndex((s) => s.slug === draggedNode?.data.stepSlug);

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
        const hoveredStepIndex = steps.findIndex((s) => s.slug === hoveredNode.data.stepSlug);

        if (hoveredStepIndex !== -1 && hoveredStepIndex !== draggedStepIndex) {
          const newSteps = [...steps];
          // Swap the items
          [newSteps[draggedStepIndex], newSteps[hoveredStepIndex]] = [
            newSteps[hoveredStepIndex],
            newSteps[draggedStepIndex],
          ];

          optimisticReorderSteps(newSteps);
        }
      }
    } else if (intersectingNodeId && isLastAddNode) {
      const newSteps = [...steps];
      const draggedNodeIndex = nodes.findIndex((n) => n.id === draggedNodeId) - 1; // -1 because the add node is not a step

      const [temp] = newSteps.splice(draggedNodeIndex, 1);
      newSteps.push(temp);

      update({
        ...(currentWorkflow as UpdateWorkflowDto),
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

          optimisticReorderSteps(newSteps);
        }
      }
    }

    setDraggedNodeId(null);
    setIntersectingNodeId(null);
    setIntersectingEdgeId(null);
  }, [
    draggedNodeId,
    workflow,
    nodes,
    intersectingNodeId,
    intersectingEdgeId,
    edges,
    optimisticReorderSteps,
    update,
    currentWorkflow,
  ]);

  useEffect(() => {
    forceUpdateNodesAndEdges();
  }, [forceUpdateNodesAndEdges]);

  return {
    nodes,
    edges,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
    onNodesChange,
    onEdgesChange,
    removeEdges,
    forceUpdateNodesAndEdges,
    onNodeDragStart: handleNodeDragStart,
    onNodeDragMove: handleNodeDragMove,
    onNodeDragEnd: handleNodeDragEnd,
  };
};
