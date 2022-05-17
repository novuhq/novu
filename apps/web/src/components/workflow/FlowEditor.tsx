import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Controls,
  Node,
  Background,
  ReactFlowInstance,
} from 'react-flow-renderer';
import ChannelNode from './ChannelNode';
import PageHeader from '../layout/components/PageHeader';
import { Button, colors, TemplateButton, Text } from '../../design-system';
import { Aside, Center, useMantineColorScheme } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MobileGradient, TapeGradient } from '../../design-system/icons';
import styled from '@emotion/styled';
import WorkflowPageHeader from './WorkflowPageHeader';
import TriggerNode from './TriggerNode';
import { channels } from '../../pages/templates/workflow/WorkflowEditorPage';

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
    position: { x: 0, y: 0 },
    // style: { width: '300px', height: '75px' },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

export function FlowEditor({ onGoBack }: { onGoBack: () => void }) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>();

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // eslint-disable-next-line no-console
    // console.log('bla', event);
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const reactFlowBounds = reactFlowWrapper?.current?.getBoundingClientRect();

      const type = event.dataTransfer.getData('application/reactflow');
      // const data = event.dataTransfer.getData('application/data');
      const parentId = event.target.dataset.id;

      console.log(event);

      // console.log(channels.filter((channel) => channel.channelType === type));

      if (typeof type === 'undefined' || !type || typeof parentId === 'undefined') {
        return;
      }

      const position = reactFlowInstance?.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      console.log(reactFlowInstance?.getZoom());

      const newId = getId();
      const newNode = {
        id: newId,
        type: 'channelNode',
        position: { x: -100, y: 75 },
        parentNode: parentId,
        data: { ...channels.filter((channel) => channel.channelType === type)[0] },
      };

      const newEdge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: 'smoothstep',
      };

      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [reactFlowInstance]
  );

  return (
    <Wrapper>
      <ReactFlowProvider>
        <div style={{ height: '500px', width: 'inherit' }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            zoomOnScroll={false}
            preventScrolling={true}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView={true}
            maxZoom={1}
            defaultZoom={0.5}
            snapToGrid={true}
          >
            <div style={{ position: 'absolute', width: '100%', zIndex: 4 }}>
              <WorkflowPageHeader title="Workflow Editor" onGoBack={onGoBack} actions={<Button>Save</Button>} />
            </div>
            <Background size={1} gap={10} color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight} />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </Wrapper>
  );
}

export default FlowEditor;

const Wrapper = styled.div`
  .react-flow__handle-left {
    top: 50%;
  }
  .react-flow__node {
    width: 200px;
    height: 75px;
    cursor: pointer;
  }
`;
