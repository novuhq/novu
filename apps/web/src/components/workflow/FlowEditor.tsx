import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Background,
  BackgroundVariant,
  ReactFlowInstance,
  useUpdateNodeInternals,
  getOutgoers,
  ReactFlowProps,
  Controls,
  useViewport,
  useReactFlow,
} from 'react-flow-renderer';
import ChannelNode from './ChannelNode';
import { colors } from '../../design-system';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import TriggerNode from './TriggerNode';
import { getChannel } from '../../pages/templates/shared/channels';
import { StepEntity, useTemplateController } from '../templates/use-template-controller.hook';
import { ChannelTypeEnum } from '@novu/shared';
import { uuid4 } from '.pnpm/@sentry+utils@6.19.3/node_modules/@sentry/utils';

const nodeTypes = {
  channelNode: ChannelNode,
  triggerNode: TriggerNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'triggerNode',
    data: {
      label: 'Trigger',
    },
    position: { x: 250, y: 100 },
  },
];

export function FlowEditor({
  steps,
  setSelectedNodeId,
  addStep,
  templateId,
  dragging,
  errors,
}: {
  steps: StepEntity[];
  setSelectedNodeId: (nodeId: string) => void;
  addStep: (channelType: ChannelTypeEnum, id: string) => void;
  templateId: string;
  dragging: boolean;
  errors: any;
}) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>();
  const { x: xPos, y: yPos, zoom } = useViewport();
  const { setViewport, zoomIn, zoomOut, getViewport } = useReactFlow();

  useEffect(() => {
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 800 });
  }, [reactFlowInstance]);

  const { setIsDirty } = useTemplateController(templateId);

  const onDelete = () => {
    setSelectedNodeId('');
    setIsDirty(true);
  };

  useEffect(() => {
    let parentId = '1';
    if (nodes.length > 1) {
      setNodes([
        {
          ...initialNodes[0],
          position: {
            ...nodes[0].position,
          },
        },
      ]);
    }
    if (steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const oldNode = nodes[i + 1] || { position: { x: 0, y: 120 } };
        const newId = step._id || step.id;
        const newNode = {
          id: newId,
          type: 'channelNode',
          position: { x: oldNode.position.x, y: oldNode.position.y },
          parentNode: parentId,
          data: {
            ...getChannel(step.template.type),
            active: step.active,
            index: nodes.length,
            showDropZone: i === steps.length - 1 && dragging,
            error: getChannelErrors(i, errors),
            onDelete,
          },
        };

        const newEdge = {
          id: `e-${parentId}-${newId}`,
          source: parentId,
          sourceHandle: 'a',
          targetHandle: 'b',
          target: newId,
          type: 'smoothstep',
        };
        parentId = newId;

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => addEdge(newEdge, eds));
      }
    }
  }, [steps, dragging, errors]);

  const onNodeClick = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    if (node.id === '1') {
      onDelete();
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
      const parentId = event.target.dataset.id;

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

      const channel = getChannel(type);

      if (!channel) {
        return;
      }

      const newId = uuid4();
      const newNode = {
        id: newId,
        type: 'channelNode',
        position: { x: 0, y: 120 },
        parentNode: parentId,
        data: {
          ...channel,
          index: nodes.length,
          active: true,
        },
      };

      addStep(newNode.data.channelType, newId);

      setNodes((nds) => nds.concat(newNode));
      updateNodeInternals(newId);

      const newEdge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        sourceHandle: 'a',
        targetHandle: 'b',
        target: newId,
        curvature: 7,
      };

      setEdges((eds) => addEdge(newEdge, eds));
      // updateNodeInternals(newId);
      reactFlowInstance?.fitBounds({ x: 0, y: 0, width: 500, height: 500 });
    },
    [reactFlowInstance, nodes, edges]
  );

  const updateNode = useCallback(() => updateNodeInternals('dndnode_0'), [updateNodeInternals]);

  return (
    <Wrapper dark={colorScheme === 'dark'}>
      <div style={{ height: '500px', width: 'inherit' }} ref={reactFlowWrapper}>
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
  );
}

export default FlowEditor;

const Wrapper = styled.div<{ dark: boolean }>`
  background: ${({ dark }) => (dark ? colors.B15 : colors.B98)};
  .react-flow__node {
    width: 200px;
    height: 75px;
    cursor: pointer;
  }
  .react-flow__handle.connectable {
    cursor: pointer;
  }
  .react-flow__handle {
    background: transparent;
    border: 1px solid ${({ dark }) => (dark ? colors.B40 : colors.B80)};
  }
  .react-flow__attribution {
    background: transparent;
    opacity: 0.5;
  }
  .react-flow__edge-path {
    stroke: ${({ dark }) => (dark ? colors.B40 : colors.B80)};
    border-radius: 10px;
    stroke-dasharray: 5;
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
      fill: ${({ dark }) => (dark ? colors.B40 : colors.B80)};
    }
  }
`;

function getChannelErrors(index: number, errors: any) {
  if (errors?.steps) {
    const stepErrors = errors.steps[index]?.template;
    if (stepErrors) {
      const keys = Object.keys(stepErrors);

      return keys.map((key) => stepErrors[key]?.message);
    }
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
  fitView: true,
  nodeExtent: [
    [0, 0],
    [700, 400],
  ],
  translateExtent: [
    [0, 0],
    [700, 400],
  ],
  minZoom: 0.5,
  maxZoom: 1.5,
  defaultZoom: 0.5,
};
