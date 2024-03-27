import ReactFlow, { Background, BackgroundVariant, Edge, Node } from 'react-flow-renderer';

import { useMantineColorScheme } from '@mantine/core';

import { colors } from '@novu/design-system';
import { InAppNode } from './InAppNode';
import { TriggerNode } from './TriggerNode';
import { WorkflowWrapper } from '../common';

export default function InAppSandboxWorkflow() {
  const { colorScheme } = useMantineColorScheme();

  return (
    <WorkflowWrapper height="100%">
      <ReactFlow
        fitView
        fitViewOptions={{ minZoom: 1, maxZoom: 1 }}
        minZoom={1}
        maxZoom={1}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnDrag={false}
        panOnScroll={false}
        preventScrolling={false}
      >
        <Background
          size={1}
          gap={12}
          variant={BackgroundVariant.Dots}
          color={colorScheme === 'dark' ? colors.BGDark : colors.B80}
        />
      </ReactFlow>
    </WorkflowWrapper>
  );
}

const edges: Edge[] = [{ id: 'e-1-2', source: '1', target: '2' }];

const NODE_INITIAL_X = 20;
const NODE_INITIAL_Y = -10;
const NODE_DIST = 150;

const nodes: Node[] = [
  {
    id: '1',
    type: 'triggerNode',
    data: {
      label: 'Trigger',
    },
    position: { x: NODE_INITIAL_X, y: NODE_INITIAL_Y },
  },
  {
    id: '2',
    type: 'inAppNode',
    data: {
      label: 'In-App',
    },
    position: { x: NODE_INITIAL_X, y: NODE_INITIAL_Y + NODE_DIST },
  },
];

const nodeTypes = { triggerNode: TriggerNode, inAppNode: InAppNode };
