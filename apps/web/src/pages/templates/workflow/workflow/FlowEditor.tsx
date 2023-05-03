import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  getOutgoers,
  Node,
  ReactFlowInstance,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import { v4 as uuid4 } from 'uuid';
import { StepTypeEnum } from '@novu/shared';

import ChannelNode from './node-types/ChannelNode';
import { colors } from '../../../../design-system';
import TriggerNode from './node-types/TriggerNode';
import { getChannel } from '../../shared/channels';
import type { IForm, IStepEntity } from '../../components/formTypes';
import AddNode from './node-types/AddNode';
import { useEnvController } from '../../../../hooks';
import { getFormattedStepErrors } from '../../shared/errors';
import { AddNodeEdge, IAddNodeEdge } from './edge-types/AddNodeEdge';
import { useBasePath } from '../../hooks/useBasePath';
import { useNavigate } from 'react-router-dom';

const nodeTypes = {
  channelNode: ChannelNode,
  triggerNode: TriggerNode,
  addNode: AddNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'triggerNode',
    data: {
      label: 'Trigger',
    },
    position: { x: 0, y: 10 },
  },
];

const initialEdges: Edge[] = [];

export function FlowEditor({
  steps,
  addStep,
  dragging,
  errors,
  onDelete,
}: {
  onDelete: (id: string) => void;
  steps: IStepEntity[];
  addStep: (channelType: StepTypeEnum, id: string, index?: number) => void;
  dragging: boolean;
  errors: any;
}) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<IAddNodeEdge>(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>();
  const { setViewport } = useReactFlow();
  const { readonly } = useEnvController();
  const { trigger: triggerErrors } = useFormContext<IForm>();
  const [displayEdgeTimeout, setDisplayEdgeTimeout] = useState<Map<string, NodeJS.Timeout | null>>(new Map());

  useEffect(() => {
    const clientWidth = reactFlowWrapper.current?.clientWidth;
    const middle = clientWidth ? clientWidth / 2 - 100 : 0;
    const zoomView = 1;
    reactFlowInstance?.project({ x: middle, y: 10 });
    setViewport({ x: middle, y: 10, zoom: zoomView });
  }, [reactFlowInstance]);

  useEffect(() => {
    initializeWorkflowTree();
  }, [steps, dragging, errors, readonly]);

  const addNewNode = useCallback(
    (parentNodeId: string, channelType: string, childId?: string) => {
      const channel = getChannel(channelType);

      if (!channel) return;

      const newId = uuid4();
      const nodeIndex = childId ? steps.findIndex((step) => step._id === parentNodeId) + 1 : undefined;

      addStep(channel.channelType, newId, nodeIndex);
    },
    [steps]
  );

  const basePath = useBasePath();
  const navigate = useNavigate();

  const onNodeClick = useCallback(
    (event, node) => {
      event.preventDefault();

      if (node.type === 'channelNode') {
        navigate(basePath + `/${node.data.channelType}/${node.data.uuid}`);
      }
      if (node.type === 'triggerNode') {
        navigate(basePath + '/test-workflow');
      }
    },
    [basePath]
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

      const parentNode = reactFlowInstance?.getNode(parentId);

      if (typeof parentNode === 'undefined') {
        return;
      }

      const childNode = getOutgoers(parentNode, nodes, edges);

      if (childNode.length) {
        return;
      }

      addNewNode(parentId, type);
    },
    [reactFlowInstance, nodes, edges]
  );

  async function initializeWorkflowTree() {
    let parentId = '1';
    initWorkflowTreeState();

    if (steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const oldNode = nodes[i + 1] || { position: { x: 0, y: 120 } };
        const newId = (step._id || step.id) as string;

        await triggerErrors('steps');

        const newNode = buildNewNode(newId, oldNode, parentId, step, i);

        const newEdge = buildNewEdge(parentId, newId);

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => addEdge(newEdge, eds));

        parentId = newId;
      }
    }
    if (!readonly) {
      const addNodeButton = buildAddNodeButton(parentId);
      setNodes((nds) => nds.concat(addNodeButton));
    }
  }

  function initWorkflowTreeState() {
    if (nodes.length === 1) {
      setNodes([
        {
          ...initialNodes[0],
        },
      ]);
      setEdges(initialEdges);
    } else {
      if (nodes.length > 1) {
        setNodes([
          {
            ...initialNodes[0],
            position: {
              ...nodes[0].position,
            },
          },
        ]);
        setEdges(initialEdges);
      }
    }
  }

  function buildNewNode(
    newId: string,
    oldNode: { position: { x: number; y: number } },
    parentId: string,
    step: IStepEntity,
    i: number
  ): Node {
    const channel = getChannel(step.template.type);

    return {
      id: newId,
      type: 'channelNode',
      position: { x: oldNode.position.x, y: oldNode.position.y },
      parentNode: parentId,
      data: {
        ...channel,
        active: step.active,
        index: i,
        error: getFormattedStepErrors(i, errors),
        onDelete,
        uuid: step.uuid,
        name: step.name,
      },
    };
  }

  function buildNewEdge(parentId: string, newId: string): Edge {
    return {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      sourceHandle: 'a',
      targetHandle: 'b',
      target: newId,
      type: 'special',
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

  const edgeTypes = useMemo(() => ({ special: AddNodeEdge }), []);

  return (
    <>
      <Wrapper dark={colorScheme === 'dark'}>
        <div
          style={{
            height: '100%',
            width: '100%',
            minHeight: '600px',
          }}
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            edgeTypes={edgeTypes}
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
            {...reactFlowDefaultProps}
          >
            <Controls />
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
    width: 200px;
    height: 75px;
    cursor: pointer;
  }
  .react-flow__node.react-flow__node-addNode {
    width: 200px;
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
`;

const reactFlowDefaultProps: ReactFlowProps = {
  defaultEdgeOptions: {
    type: 'smoothstep',
  },
  zoomOnScroll: false,
  preventScrolling: true,
  nodesConnectable: false,
  nodesDraggable: true,
  minZoom: 0.5,
  maxZoom: 1.5,
  defaultZoom: 1,
};
