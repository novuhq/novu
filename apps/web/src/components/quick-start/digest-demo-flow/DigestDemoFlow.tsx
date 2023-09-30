import { useEffect } from 'react';
import { Skeleton } from '@mantine/core';
import { useResizeObserver } from '@mantine/hooks';
import ReactFlow, { Edge, Node, useReactFlow } from 'react-flow-renderer';

import { TriggerNode } from './TriggerNode';
import { DigestNode } from './DigestNode';
import { EmailNode } from './EmailNode';
import { useTemplateFetcher } from '../../../api/hooks';
import { DigestDemoFlowProvider } from './DigestDemoFlowProvider';
import { WorkflowWrapper } from '../common';

export function DigestDemoFlow({
  isReadOnly = true,
  templateId,
  className,
  onRunTriggerClick,
  onDigestIntervalChange,
}: {
  isReadOnly?: boolean;
  templateId?: string;
  className?: string;
  onRunTriggerClick?: () => void;
  onDigestIntervalChange?: (interval: number) => void;
}) {
  const [ref, rect] = useResizeObserver();
  const reactFlowInstance = useReactFlow();
  const { isInitialLoading: isLoadingTemplate } = useTemplateFetcher(
    { templateId },
    { enabled: !isReadOnly && !!templateId, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    reactFlowInstance.fitView({ minZoom: 1, maxZoom: 1 });
  }, [reactFlowInstance, rect.width, rect.height]);

  return (
    <DigestDemoFlowProvider
      isReadOnly={isReadOnly}
      templateId={templateId}
      onRunTriggerClick={onRunTriggerClick}
      onDigestIntervalChange={onDigestIntervalChange}
    >
      <WorkflowWrapper ref={ref} height="500px" className={className}>
        {isLoadingTemplate ? (
          <Skeleton width={600} height={500} sx={{ margin: '0 auto' }} />
        ) : (
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
          />
        )}
      </WorkflowWrapper>
    </DigestDemoFlowProvider>
  );
}

const edges: Edge[] = [
  { id: 'e-1-2', source: '1', target: '2' },
  { id: 'e-2-3', source: '2', target: '3' },
];

const NODE_INITIAL_X = 20;
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
    position: { x: NODE_INITIAL_X, y: NODE_INITIAL_Y + NODE_DIST * 2 },
  },
];

const nodeTypes = { triggerNode: TriggerNode, digestNode: DigestNode, emailNode: EmailNode };
