import { EnvironmentEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeProps,
  Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportHelperFunctionOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { NODE_HEIGHT, NODE_WIDTH } from './base-node';
import { AddNodeEdge, AddNodeEdgeType } from './edges';
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
import { getFirstBodyErrorMessage, getFirstControlsErrorMessage } from './step-utils';
import { WorkflowChecklist } from './workflow-checklist';

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

const DefaultEdge = ({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) => {
  return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} style={style} />;
};

const edgeTypes = {
  addNode: AddNodeEdge,
  default: DefaultEdge,
};

const panOnDrag = [1, 2];

// y distance = node height + space between nodes
const Y_DISTANCE = NODE_HEIGHT + 50;

const mapStepToNodeContent = (step: Step): string | undefined => {
  const controlValues = step.controls.values;

  switch (step.type) {
    case StepTypeEnum.TRIGGER:
      return 'This step triggers this workflow';
    case StepTypeEnum.EMAIL:
      return 'Sends Email to your subscribers';
    case StepTypeEnum.SMS:
      return 'Sends SMS to your subscribers';
    case StepTypeEnum.IN_APP:
      return 'Sends In-App notification to your subscribers';
    case StepTypeEnum.PUSH:
      return 'Sends Push notification to your subscribers';
    case StepTypeEnum.CHAT:
      return 'Sends Chat message to your subscribers';
    case StepTypeEnum.DELAY:
      return `Delay for ${controlValues.amount} ${controlValues.unit}`;
    case StepTypeEnum.DIGEST:
      return 'Batches events into one coherent message before delivery to the subscriber.';
    case StepTypeEnum.CUSTOM:
      return 'Executes the business logic in your bridge application';
    default:
      return undefined;
  }
};

const mapStepToNode = ({
  addStepIndex,
  previousPosition,
  step,
  readOnly,
}: {
  addStepIndex: number;
  previousPosition: { x: number; y: number };
  step: Step;
  readOnly?: boolean;
}): Node<NodeData, keyof typeof nodeTypes> => {
  const content = mapStepToNodeContent(step);

  const error = getFirstBodyErrorMessage(step.issues) || getFirstControlsErrorMessage(step.issues);

  return {
    id: crypto.randomUUID(),
    position: { x: previousPosition.x, y: previousPosition.y + Y_DISTANCE },
    data: {
      name: step.name,
      content,
      addStepIndex,
      stepSlug: step.slug,
      error,
      controlValues: step.controls.values,
      readOnly,
    },
    type: step.type,
  };
};

const WorkflowCanvasChild = ({ steps, readOnly }: { steps: Step[]; readOnly?: boolean }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { currentEnvironment } = useEnvironment();
  const { workflow: currentWorkflow } = useWorkflow();
  const navigate = useNavigate();
  const { user } = useUser();
  const isWorkflowChecklistEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_CHECK_LIST_ENABLED);

  const [nodes, edges] = useMemo(() => {
    const triggerNode: Node<NodeData, 'trigger'> = {
      id: crypto.randomUUID(),
      position: { x: 0, y: 0 },
      data: {
        workflowSlug: currentWorkflow?.slug ?? '',
        environment: currentEnvironment?.slug ?? '',
        readOnly,
      },
      type: 'trigger',
    };
    let previousPosition = triggerNode.position;

    const createdNodes = steps?.map((step, index) => {
      const node = mapStepToNode({
        step,
        previousPosition,
        addStepIndex: index,
        readOnly,
      });
      previousPosition = node.position;
      return node;
    });

    let allNodes: Node<NodeData, keyof typeof nodeTypes>[] = [triggerNode, ...createdNodes];

    if (!readOnly) {
      const addNode: Node<NodeData, 'add'> = {
        id: crypto.randomUUID(),
        position: { ...previousPosition, y: previousPosition.y + Y_DISTANCE },
        data: {},
        type: 'add',
      };
      allNodes = [...allNodes, addNode];
    }

    const edges = allNodes.reduce<AddNodeEdgeType[]>((acc, node, index) => {
      if (index === 0) {
        return acc;
      }

      const parent = allNodes[index - 1];

      acc.push({
        id: `edge-${parent.id}-${node.id}`,
        source: parent.id,
        sourceHandle: 'b',
        targetHandle: 'a',
        target: node.id,
        type: readOnly ? 'default' : 'addNode',
        style: {
          stroke: 'hsl(var(--neutral-alpha-200))',
          strokeWidth: 2,
          strokeDasharray: 5,
        },
        data: readOnly
          ? undefined
          : {
              isLast: index === allNodes.length - 1,
              addStepIndex: index - 1,
            },
      });

      return acc;
    }, []);

    return [allNodes, edges];
  }, [steps, readOnly, currentWorkflow?.slug, currentEnvironment?.slug]);

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
    <div ref={reactFlowWrapper} className="h-full w-full" id="workflow-canvas-container">
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
        onPaneClick={() => {
          if (readOnly) {
            return;
          }

          // unselect node if clicked on background
          if (currentEnvironment?.slug && currentWorkflow?.slug) {
            navigate(
              buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: currentEnvironment.slug,
                workflowSlug: currentWorkflow.slug,
              })
            );
          }
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
      {currentWorkflow &&
        currentEnvironment?.name === EnvironmentEnum.DEVELOPMENT &&
        !user?.unsafeMetadata?.workflowChecklistCompleted &&
        isWorkflowChecklistEnabled && <WorkflowChecklist steps={steps} workflow={currentWorkflow} />}
    </div>
  );
};

export const WorkflowCanvas = ({ steps, readOnly }: { steps: Step[]; readOnly?: boolean }) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasChild steps={steps || []} readOnly={readOnly} />
    </ReactFlowProvider>
  );
};
