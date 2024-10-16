import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportHelperFunctionOptions,
} from '@xyflow/react';
import { StepTypeEnum, type StepResponseDto } from '@novu/shared';
import '@xyflow/react/dist/style.css';
import {
  AddNode,
  ChatNode,
  CustomNode,
  DelayNode,
  DigestNode,
  EmailNode,
  InAppNode,
  NodeData,
  PushNode,
  SmsNode,
  TriggerNode,
} from './nodes';
import { AddNodeEdgeType, AddNodeEdge } from './edges';
import { NODE_HEIGHT, NODE_WIDTH } from './base-node';

const nodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  sms: SmsNode,
  in_app: InAppNode,
  push: PushNode,
  chat: ChatNode,
  delay: DelayNode,
  digest: DigestNode,
  custom: CustomNode,
  add: AddNode,
};

const edgeTypes = {
  addNode: AddNodeEdge,
};

const panOnDrag = [1, 2];

// y distance = node height + space between nodes
const Y_DISTANCE = NODE_HEIGHT + 50;

const mapStepToNode = (
  step: StepResponseDto,
  previousPosition: { x: number; y: number }
): Node<NodeData, keyof typeof nodeTypes> => {
  let content = '';
  if (step.type === StepTypeEnum.DELAY) {
    content = `Wait to send ~ 30 minutes`;
  }

  return {
    id: step.stepUuid,
    position: { x: previousPosition.x, y: previousPosition.y + Y_DISTANCE },
    data: {
      name: step.name,
      content,
    },
    type: step.type,
  };
};

const WorkflowCanvasChild = ({ steps }: { steps: StepResponseDto[] }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const nodes = useMemo(() => {
    const triggerNode = { id: '0', position: { x: 0, y: 0 }, data: {}, type: 'trigger' };
    let previousPosition = triggerNode.position;

    const createdNodes = steps.map((el) => {
      const node = mapStepToNode(el, previousPosition);
      previousPosition = node.position;
      return node;
    });

    const addNode = {
      id: `${Number.MAX_SAFE_INTEGER}`,
      position: { ...previousPosition, y: previousPosition.y + Y_DISTANCE },
      data: {},
      type: 'add',
    };

    return [triggerNode, ...createdNodes, addNode];
  }, [steps]);

  const edges = useMemo(
    () =>
      nodes.reduce<AddNodeEdgeType[]>((acc, node, idx) => {
        if (idx === 0) {
          return acc;
        }

        const parent = nodes[idx - 1];
        acc.push({
          id: `edge-${parent.id}-${node.id}`,
          source: parent.id,
          sourceHandle: 'b',
          targetHandle: 'a',
          target: node.id,
          type: 'addNode',
          style: { stroke: 'hsl(var(--neutral-alpha-200))', strokeWidth: 2, strokeDasharray: 5 },
          data: {
            isLast: idx === nodes.length - 1,
          },
        });

        return acc;
      }, []),
    [nodes]
  );

  const positionCanvas = useCallback(
    (options?: ViewportHelperFunctionOptions) => {
      const clientWidth = reactFlowWrapper.current?.clientWidth;
      const middle = clientWidth ? clientWidth / 2 - NODE_WIDTH / 2 : 0;

      reactFlowInstance.setViewport({ x: middle, y: 50, zoom: 1 }, options);
    },
    [reactFlowInstance]
  );

  useEffect(() => {
    const listener = () => positionCanvas({ duration: 300 });

    window.addEventListener('resize', listener);

    return () => {
      window.removeEventListener('resize', listener);
    };
  }, [positionCanvas]);

  useLayoutEffect(() => {
    positionCanvas();
  }, [positionCanvas]);

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={null}
        maxZoom={1}
        minZoom={1}
        panOnScroll
        selectionOnDrag
        panOnDrag={panOnDrag}
      >
        <Controls showZoom={false} />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export const WorkflowCanvas = ({ steps }: { steps: StepResponseDto[] }) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasChild steps={steps} />
    </ReactFlowProvider>
  );
};
