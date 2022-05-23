import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-flow-renderer';
import ChannelNode from './ChannelNode';
import { Button, colors } from '../../design-system';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import WorkflowPageHeader from './WorkflowPageHeader';
import TriggerNode from './TriggerNode';
import { getChannel } from '../../pages/templates/shared/channels';

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

let id = 0;
const getId = () => `dndnode_${id++}`;

export function FlowEditor({
  onGoBack,
  setSelected,
  channelButtons,
}: {
  setSelected: (string) => void;
  onGoBack: () => void;
  channelButtons: string[];
  changeTab: (string) => void;
}) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>();

  useEffect(() => {
    if (channelButtons.length) {
      let parentId = '1';
      for (const type of channelButtons) {
        const newId = getId();
        const newNode = {
          id: newId,
          type: 'channelNode',
          position: { x: 0, y: 120 },
          parentNode: parentId,
          data: { ...getChannel(type), index: nodes.length },
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
  }, [channelButtons]);

  const onNodeClick = useCallback((event, node) => {
    event.preventDefault();
    setSelected(node.data.tabKey);
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

      const newId = getId();
      const newNode = {
        id: newId,
        type: 'channelNode',
        position: { x: 0, y: 120 },
        parentNode: parentId,
        data: {
          ...getChannel(type),
          index: nodes.length,
        },
      };

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
          <div style={{ position: 'absolute', width: '100%', zIndex: 4 }}>
            <WorkflowPageHeader title="Workflow Editor" onGoBack={onGoBack} actions={<Button>Save</Button>} />
          </div>
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
  }
  .react-flow__node.selected {
    .react-flow__handle {
      background: ${colors.horizontal};
      border: none;
    }
  }
`;

const reactFlowDefaultProps: ReactFlowProps = {
  defaultEdgeOptions: {
    type: 'smoothstep',
    style: { border: `1px dash red !important` },
  },
  zoomOnScroll: false,
  preventScrolling: true,
  nodesConnectable: false,
  nodesDraggable: false,
  fitView: true,
  minZoom: 1,
  maxZoom: 1,
};
