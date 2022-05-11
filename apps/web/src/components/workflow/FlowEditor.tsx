import { useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Controls,
  Node,
  Background,
} from 'react-flow-renderer';
import ChannelNode from './ChannelNode';
import PageHeader from '../layout/components/PageHeader';
import { Button, colors, Text } from '../../design-system';
import { Aside, Center, useMantineColorScheme } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MobileGradient } from '../../design-system/icons';

const nodeTypes = {
  channelNode: ChannelNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Trigger' },
    position: { x: 250, y: 5 },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const FlowEditor = () => {
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // console.log(event);
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    // const data = event.dataTransfer.getData('application/data');
    const parentId = event.target.dataset.id;
    // console.log(data[0]);

    if (typeof type === 'undefined' || !type || typeof parentId === 'undefined') {
      return;
    }

    const newId = getId();
    const newNode = {
      id: newId,
      type,
      position: { x: 10, y: 90 },
      parent: event.target.dataset.id,
      data: { label: 'in app', description: 'bla bla', Icon: MobileGradient },
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges([
      {
        id: 'e1',
        source: event.target.dataset.id,
        target: newId,
      },
    ]);
  }, []);

  return (
    <div style={{ height: '700px', width: 'inherit' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        zoomOnScroll={false}
        preventScrolling={true}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
      >
        <Background size={1} gap={10} color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight} />
        <PageHeader title="Workflow Editor" actions={<Button>Save</Button>} />
        <Center inline>
          <ArrowLeft color={colors.B60} />
          <Text color={colors.B60} ml={5}>
            <div onClick={() => navigate('/templates/create')}>Go Back</div>
          </Text>
        </Center>
      </ReactFlow>
    </div>
  );
};

export default FlowEditor;
