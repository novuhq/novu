import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Background,
  BackgroundVariant,
  ReactFlowInstance,
  useUpdateNodeInternals,
  getOutgoers,
  applyEdgeChanges,
} from 'react-flow-renderer';
import ChannelNode from './ChannelNode';
import { Button, colors } from '../../design-system';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import WorkflowPageHeader from './WorkflowPageHeader';
import TriggerNode from './TriggerNode';
import { channels, getChannel } from '../../pages/templates/workflow/WorkflowEditorPage';

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
          position: { x: nodes.length % 2 === 0 ? 200 : -200, y: 100 },
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const childNode = getOutgoers(parentNode, nodes, edges);
      if (childNode.length) {
        return;
      }

      const newId = getId();
      const newNode = {
        id: newId,
        type: 'channelNode',
        position: { x: nodes.length % 2 === 0 ? 200 : -200, y: 100 },
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
        type: 'smoothstep',
      };

      setEdges((eds) => addEdge(newEdge, eds));
      updateNodeInternals(newId);
      reactFlowInstance?.fitBounds({ x: 0, y: 0, width: 500, height: 500 });
    },
    [reactFlowInstance, nodes, edges]
  );

  const updateNode = useCallback(() => updateNodeInternals('dndnode_0'), [updateNodeInternals]);

  return (
    <Wrapper>
      <div style={{ height: '500px', width: 'inherit' }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          zoomOnScroll={false}
          preventScrolling={true}
          nodesConnectable={false}
          nodesDraggable={false}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView={true}
          onNodeClick={onNodeClick}
          minZoom={1}
          snapToGrid={false}
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

const Wrapper = styled.div`
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
    border: 1px solid ${colors.B40};
  }
  .react-flow__connection {
    .react-flow__edge-path {
      color: red;
      background: red;
    }
    .react-flow__edge {
      color: red;
      background: red;
    }
  }
  .react-flow__attribution {
    background: transparent;
    opacity: 0.5;
  }
  .react-flow__node.selected {
    .react-flow__handle {
      background: ${colors.horizontal};
      border: none;
    }
  }
`;
