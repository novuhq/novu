import { ComponentType, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  EdgeProps,
  getOutgoers,
  Node,
  NodeProps,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'react-flow-renderer';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import { v4 as uuid4 } from 'uuid';
import cloneDeep from 'lodash.clonedeep';
import { StepTypeEnum } from '@novu/shared';

import { colors } from '../../design-system';
import {
  computeNodeActualPosition,
  getChannel,
  getOffsetPosition,
  triggerFromReplaceHandle,
} from '../../utils/channels';
import { useEnvController } from '../../hooks';
import type { IEdge, IFlowStep } from './types';

const triggerNode: Node = {
  id: '1',
  type: 'triggerNode',
  data: {
    label: 'Trigger',
  },
  position: { x: 0, y: 10 },
};

const DEFAULT_WRAPPER_STYLES = {
  height: '100%',
  width: '100%',
  minHeight: '600px',
};

const ClonedNodeId = 'temp_cloned_node';

interface IFlowEditorProps extends ReactFlowProps {
  steps: IFlowStep[];
  dragging?: boolean;
  errors?: any;
  nodeTypes: {
    triggerNode: ComponentType<NodeProps>;
    channelNode: ComponentType<NodeProps>;
    addNode?: ComponentType<NodeProps>;
  };
  edgeTypes?: { special: ComponentType<EdgeProps> };
  withControls?: boolean;
  wrapperStyles?: React.CSSProperties;
  onDelete?: (id: string) => void;
  onStepInit?: (step: IFlowStep) => Promise<void>;
  onGetStepError?: (i: number, errors: any) => string;
  addStep?: (channelType: StepTypeEnum, id: string, index?: number) => void;
  moveStepPosition?: (id: string, stepIndex: number) => void;
}

export function FlowEditor({
  steps,
  dragging,
  errors,
  defaultEdgeOptions = {
    type: 'smoothstep',
  },
  zoomOnScroll = false,
  preventScrolling = true,
  nodesConnectable = false,
  nodesDraggable = true,
  minZoom = 0.5,
  maxZoom = 1.5,
  defaultZoom = 1,
  nodeTypes,
  edgeTypes,
  withControls = true,
  wrapperStyles = DEFAULT_WRAPPER_STYLES,
  onStepInit,
  onGetStepError,
  addStep,
  moveStepPosition,
  onDelete,
  onNodeClick: onClick,
  ...restProps
}: IFlowEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const nodesRef = useRef<Array<Node<any>>>([]);
  const [onRepositioning, setOnRepositioning] = useState(false);
  const [edges, setEdges, onEdgesChange] = useEdgesState<IEdge>([]);
  const reactFlowInstance = useReactFlow();
  const { readonly } = useEnvController();
  const [displayEdgeTimeout, setDisplayEdgeTimeout] = useState<Map<string, NodeJS.Timeout | null>>(new Map());

  useEffect(() => {
    const clientWidth = reactFlowWrapper.current?.clientWidth;
    const middle = clientWidth ? clientWidth / 2 - 100 : 0;
    const zoomView = 1;

    reactFlowInstance.setViewport({ x: middle, y: 10, zoom: zoomView });
  }, [reactFlowInstance]);

  useEffect(() => {
    setTimeout(() => {
      initializeWorkflowTree();
    }, 0);
  }, [steps, dragging, errors, readonly]);

  const addNewNode = useCallback(
    (parentNodeId: string, channelType: string, childId?: string) => {
      if (!addStep) return;

      const channel = getChannel(channelType);
      if (!channel) return;

      const newId = uuid4();
      const nodeIndex = childId ? steps.findIndex((step) => step._id === parentNodeId) + 1 : undefined;

      addStep(channel.channelType, newId, nodeIndex);
    },
    [addStep, steps]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const parentId = nodes[nodes.length - 2].id;

      if (typeof type === 'undefined' || !type || typeof parentId === 'undefined') {
        return;
      }

      const parentNode = reactFlowInstance.getNode(parentId);
      if (typeof parentNode === 'undefined') {
        return;
      }

      const childNode = getOutgoers(parentNode, nodes, edges);

      if (childNode.length) {
        return;
      }

      addNewNode(parentId, type);
    },
    [addNewNode, reactFlowInstance, nodes, edges]
  );

  const updateNodeConnections = useCallback(
    (updatedNodes) => {
      const edgeType = edgeTypes ? 'special' : 'default';

      setEdges(
        updatedNodes
          .slice(1, nodes.length - 1)
          .map(({ id, parentNode }) => buildNewEdge(parentNode ?? '', id, edgeType))
      );
    },
    [setEdges]
  );

  const onNodeDragStop = useCallback(
    (_, node: Node<any>) => {
      if (onRepositioning) {
        // Check the direction of the swapping, if it is with a node at the top or bottom.
        const isUpward = node.position.y > (nodesRef.current?.find(({ id }) => id === node.id)?.position.y ?? 0);

        /*
         * Filter out the cloned node & also compute every node actual position relative to the flow
         * work area. This is used to sort the nodes, which helps to get the new position of node being swapped.
         */
        const clonedNodes = nodes
          .filter(({ id }) => id !== ClonedNodeId)
          .map((mappedNode) => computeNodeActualPosition(getOffsetPosition(node.id, mappedNode, isUpward), nodes));

        const filteredNodes = cloneDeep(clonedNodes).filter(({ type }) => type === 'channelNode');

        // Get the initial position before the swapping.
        const sourcePosition = filteredNodes.findIndex(({ id }) => id === node.id);

        // Get the current position after the swapping.
        const targetPosition = filteredNodes
          .sort(({ actualPosition: { y: aY } }, { actualPosition: { y: bY } }) => aY - bY)
          .findIndex(({ id }) => node.id === id);

        /*
         * Updates the positions of the nodes to their initial positions. If no swapping has occurred,
         * the node is snapped back to its original position. Additionally, it handles updating the node whose
         * parent node ID has been changed to the cloned ID, resetting it to its initial parent node ID.
         */
        const newNodes = clonedNodes.map(({ parentNode, ...others }, index) => ({
          ...others,
          parentNode: parentNode === ClonedNodeId ? node.id : parentNode,
          position: nodesRef.current[index].position,
        }));

        setNodes(newNodes);

        // If no swapping occurred, update the edges & return.
        if (sourcePosition === targetPosition) {
          updateNodeConnections(newNodes);

          return;
        }

        moveStepPosition?.(node.id, targetPosition);
      }

      setOnRepositioning(false);
    },
    [nodes, onRepositioning, edges]
  );

  const onNodeDragStart = useCallback(
    (event: ReactMouseEvent, node: Node<any>) => {
      if (!triggerFromReplaceHandle(event)) return;
      /**
       * The nodes are cloned and a new node is created.
       */
      nodesRef.current = nodes;
      const clonedNodes = cloneDeep(nodes);
      const clonedNode = cloneDeep(node);
      const childNode = clonedNodes.find(({ parentNode }) => parentNode === node.id) as Node;
      clonedNode.id = ClonedNodeId;

      if (childNode) childNode.parentNode = ClonedNodeId;

      setOnRepositioning(true);
      /*
       * When the user tries to reposition a node, the connecting edge is removed so that it doesn't
       * cause confusion for the user, making them think they are repositioning the node and all its descendants.
       */
      setEdges((newEdges) =>
        newEdges.map((edge) => {
          let source = node.id === edge.target ? '' : edge.source;
          if (edge.source === node.id) source = '';

          return { ...edge, source };
        })
      );
      setNodes([...clonedNodes, clonedNode]);

      const nodeDocument = document.querySelector(`.react-flow__node[data-id="${node.id}"]`);
      if (nodeDocument) nodeDocument.classList.add('swap-drag-active');
    },
    [setEdges, nodes]
  );

  const onNodeClick = useCallback(
    (event: ReactMouseEvent, node: Node<any>) => {
      onClick?.(event, node);

      const childNode = nodes.find(({ parentNode }) => parentNode === ClonedNodeId);
      if (childNode) {
        childNode.parentNode = node.id;
        const newNodes = nodes.filter(({ id }) => id !== ClonedNodeId);
        setNodes(newNodes);

        updateNodeConnections(newNodes);
      }
    },
    [setNodes, nodes]
  );

  async function initializeWorkflowTree() {
    let parentId = '1';
    const finalNodes = [cloneDeep(triggerNode)];
    let finalEdges: Edge<any>[] = [];

    if (steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const oldNode = nodes[i + 1];
        const position = oldNode && oldNode.type !== 'addNode' ? oldNode.position : { x: 0, y: 120 };
        const newId = (step._id || step.id) as string;

        await onStepInit?.(step);

        const newNode = buildNewNode(newId, position, parentId, step, i);
        finalNodes.push(newNode);

        const edgeType = edgeTypes ? 'special' : 'default';
        const newEdge = buildNewEdge(parentId, newId, edgeType);
        finalEdges = addEdge(newEdge, finalEdges);

        parentId = newId;
      }
    }
    if (!readonly && nodeTypes.addNode) {
      const addNodeButton = buildAddNodeButton(parentId);
      finalNodes.push(addNodeButton);
    }

    setNodes(finalNodes);
    setEdges(finalEdges);
  }

  function buildNewNode(
    newId: string,
    position: { x: number; y: number },
    parentId: string,
    step: IFlowStep,
    i: number
  ): Node {
    const channel = getChannel(step.template?.type);

    return {
      id: newId,
      type: 'channelNode',
      position: { x: position.x, y: position.y },
      parentNode: parentId,
      data: {
        ...channel,
        active: step.active,
        index: i,
        error: onGetStepError?.(i, errors) ?? '',
        onDelete,
        uuid: step.uuid,
        name: step.name,
        content: step.template?.content,
        htmlContent: step.template?.htmlContent,
        delayMetadata: step.delayMetadata,
        digestMetadata: step.digestMetadata,
      },
    };
  }

  function buildNewEdge(parentId: string, newId: string, type: string): Edge {
    return {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      sourceHandle: 'a',
      targetHandle: 'b',
      target: newId,
      type,
      data: { addNewNode: addNewNode, parentId: parentId, childId: newId, readonly: readonly },
    };
  }

  function buildAddNodeButton(parentId: string): Node {
    return {
      id: '2',
      type: 'addNode',
      data: {
        label: '',
        addNewNode,
        parentId,
        showDropZone: dragging,
        readonly,
      },
      className: 'nodrag',
      connectable: false,
      parentNode: parentId,
      position: { x: 0, y: 90 },
    };
  }

  const handleDisplayAddNodeOnEdge = (edgeId: string) => {
    const edgeElement = document.getElementById(edgeId);

    if (!edgeElement) return;
    const ADD_NODE_DISPLAY_TIMEOUT = 10000;

    if (isEdgeAddNodeButtonVisible(edgeElement)) {
      const nodeTimeout = displayEdgeTimeout.get(edgeId);

      if (nodeTimeout) {
        clearTimeout(nodeTimeout);
        setDisplayEdgeTimeout(displayEdgeTimeout.set(edgeId, null));
      }
    } else {
      toggleAddNodeButtonOpacity(edgeElement);
    }

    setDisplayEdgeTimeout(
      displayEdgeTimeout.set(
        edgeId,
        setTimeout(() => {
          toggleAddNodeButtonOpacity(edgeElement);
        }, ADD_NODE_DISPLAY_TIMEOUT)
      )
    );

    function toggleAddNodeButtonOpacity(target) {
      target.classList.toggle('fade');
    }

    function isEdgeAddNodeButtonVisible(element: HTMLElement) {
      return element?.classList.contains('fade');
    }
  };

  return (
    <>
      <Wrapper dark={colorScheme === 'dark'}>
        <div style={wrapperStyles} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeMouseMove={(event, node) => {
              if (!readonly) {
                handleDisplayAddNodeOnEdge(`edge-button-${node.id}`);
              }
            }}
            onEdgeMouseMove={(event: ReactMouseEvent, edge: Edge) => {
              if (!readonly) {
                handleDisplayAddNodeOnEdge(`edge-button-${edge.source}`);
              }
            }}
            /*
             * TODO: for now this disables the deletion of a step using delete/backspace keys
             * as it will require some sort of refactoring of how we save the workflow state
             * to properly support keyboard delete events
             * Remove this line once we tackle the workflow state handling
             */
            deleteKeyCode={null}
            defaultEdgeOptions={defaultEdgeOptions}
            zoomOnScroll={zoomOnScroll}
            preventScrolling={preventScrolling}
            nodesConnectable={nodesConnectable}
            nodesDraggable={nodesDraggable}
            minZoom={minZoom}
            maxZoom={maxZoom}
            defaultZoom={defaultZoom}
            onNodeDragStop={onNodeDragStop}
            onNodeDragStart={onNodeDragStart}
            onNodeClick={onNodeClick}
            {...restProps}
          >
            {withControls && <Controls />}
            <Background
              size={1}
              gap={10}
              variant={BackgroundVariant.Dots}
              color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
            />
          </ReactFlow>
        </div>
      </Wrapper>
    </>
  );
}

export default FlowEditor;

const Wrapper = styled.div<{ dark: boolean }>`
  flex: 1 1 0%;
  background: ${({ dark }) => (dark ? colors.B15 : colors.B98)};
  .react-flow__node.react-flow__node-channelNode,
  .react-flow__node.react-flow__node-triggerNode {
    width: 280px;
    height: 80px;
    cursor: pointer;
    &.swap-drag-active {
      z-index: 1001 !important;
    }
    [data-blue-gradient-svg] {
      stop:first-child {
        stop-color: #4c6dd4 !important;
      }
      stop:last-child {
        stop-color: #66d9e8 !important;
      }
    }

    [data-workflow-node-icon] {
      stop {
        stop-color: white !important;
      }
    }
  }

  .react-flow__node.react-flow__node-addNode {
    cursor: default;
    width: 280px;
  }
  .react-flow__handle.connectable {
    cursor: pointer;
  }
  .react-flow__handle {
    background: transparent;
    border: 1px solid ${colors.B60};
  }
  .react-flow__attribution {
    background: transparent;
    opacity: 0.5;
  }
  .react-flow__edge-path {
    stroke: ${colors.B60};
    border-radius: 10px;
    stroke-dasharray: 5;
    stroke-width: 2px;
  }
  .react-flow__node.selected {
    .react-flow__handle {
      background: ${colors.horizontal};
      border: none;
    }
  }

  .react-flow__controls {
    box-shadow: none;
  }

  .react-flow__controls-interactive {
    display: none;
  }

  .react-flow__controls-button {
    background: transparent;
    border: none;

    svg {
      fill: ${colors.B60};
    }
  }

  [data-template-store-editor] [data-workflow-node-icon] {
    stop:first-child {
      stop-color: #dd2476 !important;
    }
    stop:last-child {
      stop-color: #ff512f !important;
    }
  }
`;
