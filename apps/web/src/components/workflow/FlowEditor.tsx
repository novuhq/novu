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
import ChannelNode from './node-types/ChannelNode';
import { colors } from '../../design-system';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import TriggerNode from './node-types/TriggerNode';
import { getChannel } from '../../pages/templates/shared/channels';
import { StepEntity, useTemplateController } from '../templates/use-template-controller.hook';
import { StepTypeEnum } from '@novu/shared';
import { v4 as uuid4 } from 'uuid';
import AddNode from './node-types/AddNode';
import { useEnvController } from '../../store/use-env-controller';
import { MinimalTemplatesSideBar } from './layout/MinimalTemplatesSideBar';
import { ActivePageEnum } from '../../pages/templates/editor/TemplateEditorPage';
import { AddNodeEdge, IAddNodeEdge } from './edge-types/AddNodeEdge';

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
  activePage,
  setActivePage,
  steps,
  setSelectedNodeId,
  addStep,
  dragging,
  errors,
  onDelete,
  templateId,
}: {
  activePage: ActivePageEnum;
  setActivePage: (string) => void;
  onDelete: (id: string) => void;
  steps: StepEntity[];
  setSelectedNodeId: (nodeId: string) => void;
  addStep: (channelType: StepTypeEnum, id: string, index?: number) => void;
  dragging: boolean;
  errors: any;
  templateId: string;
}) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<IAddNodeEdge>(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>();
  const { setViewport } = useReactFlow();
  const { readonly } = useEnvController();
  const { template, trigger, methods } = useTemplateController(templateId);
  const [displayEdgeTimeout, setDisplayEdgeTimeout] = useState<Map<string, NodeJS.Timeout | null>>(new Map());

  useEffect(() => {
    if (reactFlowWrapper) {
      const clientWidth = reactFlowWrapper.current?.clientWidth;
      const middle = clientWidth ? clientWidth / 2 - 100 : 0;
      const zoomView = nodes.length > 4 ? 0.75 : 1;
      const xyPos = reactFlowInstance?.project({ x: middle, y: 0 });
      setViewport({ x: xyPos?.x ?? 0, y: xyPos?.y ?? 0, zoom: zoomView }, { duration: 800 });
    }
  }, [reactFlowInstance]);

  useEffect(() => {
    initializeWorkflowTree();
  }, [steps, dragging, errors]);

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

  const onNodeClick = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    if (node.id === '1') {
      setSelectedNodeId('');
    }
  }, []);

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

  function initializeWorkflowTree() {
    let parentId = '1';
    initWorkflowTreeState();

    if (steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const oldNode = nodes[i + 1] || { position: { x: 0, y: 120 } };
        const newId = step._id || step.id;

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
    step: StepEntity,
    i: number
  ): Node {
    return {
      id: newId,
      type: 'channelNode',
      position: { x: oldNode.position.x, y: oldNode.position.y },
      parentNode: parentId,
      data: {
        ...getChannel(step.template.type),
        active: step.active,
        index: nodes.length,
        error: getChannelErrors(i, errors, step),
        onDelete,
        setActivePage,
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
      data: { addNewNode: addNewNode, parentId: parentId, childId: newId },
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
        <div style={{ minHeight: '500px', height: '100%', width: 'inherit' }} ref={reactFlowWrapper}>
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
            {...reactFlowDefaultProps}
          >
            <MinimalTemplatesSideBar
              activePage={activePage}
              setActivePage={setActivePage}
              showTriggerSection={!!template && !!trigger}
              showErrors={methods.formState.isSubmitted && Object.keys(errors).length > 0}
            />
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

function getChannelErrors(index: number, errors: any, step: any) {
  if (errors?.steps) {
    const stepErrors = errors.steps[index]?.template;
    if (stepErrors) {
      const keys = Object.keys(stepErrors);

      return keys.map((key) => stepErrors[key]?.message);
    }
    const actionErrors = errors.steps[index]?.metadata;
    if (actionErrors) {
      const keys = Object.keys(actionErrors);

      return keys.map((key) => actionErrors[key]?.message);
    }
  }
  if (step.template.type === StepTypeEnum.EMAIL && !step.template.subject) {
    return 'Something is missing here';
  }

  if (
    step.template.content.length === 0 &&
    step.template.type !== StepTypeEnum.DIGEST &&
    step.template.type !== StepTypeEnum.DELAY &&
    step.template.type !== StepTypeEnum.EMAIL
  ) {
    return 'Something is missing here';
  }
}

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
