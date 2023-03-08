import React from 'react';
import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import ReactFlow, { Edge, Node } from 'react-flow-renderer';

import { colors } from '../../../../design-system';
import { TriggerNode } from './nodes/TriggerNode';
import { DigestNode } from './nodes/DigestNode';
import { EmailNode } from './nodes/EmailNode';

export function DigestDemoFlow() {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Wrapper dark={colorScheme === 'dark'}>
      <div style={{ minHeight: '500px', height: '100%', width: 'inherit' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          style={{ minHeight: '500px' }}
          nodeTypes={nodeTypes}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnDrag={false}
          panOnScroll={false}
        />
      </div>
    </Wrapper>
  );
}

const edges: Edge[] = [
  { id: 'e-1-2', source: '1', target: '2', type: 'special' },
  { id: 'e-2-3', source: '2', target: '3', type: 'special' },
];

const NODE_INITIAL_X = 100;
const NODE_INITIAL_Y = 20;
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
    type: 'digestNode',
    data: {
      label: 'Digest',
    },
    position: { x: NODE_INITIAL_X, y: NODE_INITIAL_Y + NODE_DIST },
  },
  {
    id: '3',
    type: 'emailNode',
    data: {
      label: 'Email',
    },
    position: { x: NODE_INITIAL_X, y: NODE_INITIAL_Y + NODE_DIST + NODE_DIST },
  },
];

const nodeTypes = { triggerNode: TriggerNode, digestNode: DigestNode, emailNode: EmailNode };

const Wrapper = styled.div<{ dark: boolean }>`
  .react-flow__node.react-flow__node-triggerNode,
  .react-flow__node.react-flow__node-digestNode,
  .react-flow__node.react-flow__node-emailNode {
    cursor: default;
  }

  .react-flow__attribution {
    display: none;
  }

  .react-flow__handle {
    background: transparent;
    border: 1px solid ${(dark) => (dark ? colors.B40 : colors.B60)};
  }

  .react-flow__edge-path {
    stroke: ${(dark) => (dark ? colors.B40 : colors.B60)};
    border-radius: 10px;
    stroke-dasharray: 5;
    stroke-width: 1px;
  }
`;
