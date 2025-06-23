import { EnvironmentEnum, WorkflowOriginEnum, PermissionsEnum } from '@novu/shared';
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
import { generateUUID } from '@/utils/uuid';

import { getFirstErrorMessage } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { WorkflowChecklist } from './workflow-checklist';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useHasPermission } from '@/hooks/use-has-permission';

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

const mapStepToNodeContent = (step: Step, workflowOrigin: WorkflowOriginEnum): string | undefined => {
  const controlValues = step.controls.values;
  const delayMessage =
    workflowOrigin === WorkflowOriginEnum.EXTERNAL
      ? 'Delay duration defined in code'
      : `Delay for ${controlValues.amount} ${controlValues.unit}`;

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
      return delayMessage;
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
  workflowOrigin = WorkflowOriginEnum.NOVU_CLOUD,
  isTemplateStorePreview,
}: {
  addStepIndex: number;
  previousPosition: { x: number; y: number };
  step: Step;
  workflowOrigin?: WorkflowOriginEnum;
  isTemplateStorePreview?: boolean;
}): Node<NodeData, keyof typeof nodeTypes> => {
  const content = mapStepToNodeContent(step, workflowOrigin);

  const error = step.issues
    ? getFirstErrorMessage(step.issues, 'controls') || getFirstErrorMessage(step.issues, 'integration')
    : undefined;

  return {
    id: generateUUID(),
    position: { x: previousPosition.x, y: previousPosition.y + Y_DISTANCE },
    data: {
      name: step.name,
      content,
      addStepIndex,
      stepSlug: step.slug,
      error: error?.message,
      controlValues: step.controls.values,
      isTemplateStorePreview,
    },
    type: step.type,
  };
};

const WorkflowCanvasChild = ({
  steps,
  isTemplateStorePreview,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { currentEnvironment } = useEnvironment();
  const { workflow: currentWorkflow } = useWorkflow();
  const navigate = useNavigate();
  const { user } = useUser();

  const [nodes, edges] = useMemo(() => {
    const triggerNode: Node<NodeData, 'trigger'> = {
      id: generateUUID(),
      position: { x: 0, y: 0 },
      data: {
        workflowSlug: currentWorkflow?.slug ?? '',
        environment: currentEnvironment?.slug ?? '',
        isTemplateStorePreview,
      },
      type: 'trigger',
    };
    let previousPosition = triggerNode.position;

    const createdNodes = steps?.map((step, index) => {
      const node = mapStepToNode({
        step,
        previousPosition,
        addStepIndex: index,
        workflowOrigin: currentWorkflow?.origin,
        isTemplateStorePreview,
      });
      previousPosition = node.position;
      return node;
    });

    let allNodes: Node<NodeData, keyof typeof nodeTypes>[] = [triggerNode, ...createdNodes];

    const addNode: Node<NodeData, 'add'> = {
      id: generateUUID(),
      position: { ...previousPosition, y: previousPosition.y + Y_DISTANCE },
      data: {},
      type: 'add',
    };
    allNodes = [...allNodes, addNode];

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
        type: isTemplateStorePreview ? 'default' : 'addNode',
        style: {
          stroke: 'hsl(var(--neutral-alpha-200))',
          strokeWidth: 2,
          strokeDasharray: 5,
        },
        data: isTemplateStorePreview
          ? undefined
          : {
              isLast: index === allNodes.length - 1,
              addStepIndex: index - 1,
            },
      });

      return acc;
    }, []);

    return [allNodes, edges];
  }, [steps, currentWorkflow?.slug, currentEnvironment?.slug, isTemplateStorePreview]);

  const positionCanvas = useCallback(
    (options?: ViewportHelperFunctionOptions) => {
      const clientWidth = reactFlowWrapper.current?.clientWidth;
      const middle = clientWidth ? clientWidth / 2 - NODE_WIDTH / 2 : 0;

      reactFlowInstance.setViewport({ x: middle, y: 50, zoom: 0.99 }, options);
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
        minZoom={0.9}
        panOnScroll
        selectionOnDrag
        panOnDrag={panOnDrag}
        onPaneClick={() => {
          if (isTemplateStorePreview) {
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
        currentWorkflow.origin === WorkflowOriginEnum.NOVU_CLOUD &&
        !user?.unsafeMetadata?.workflowChecklistCompleted && (
          <WorkflowChecklist steps={steps} workflow={currentWorkflow} />
        )}
    </div>
  );
};

export const WorkflowCanvas = ({
  steps,
  isTemplateStorePreview,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
}) => {
  const has = useHasPermission();
  const showReadOnlyOverlay = !has({ permission: PermissionsEnum.WORKFLOW_WRITE });

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <WorkflowCanvasChild steps={steps || []} isTemplateStorePreview={isTemplateStorePreview} />

        {showReadOnlyOverlay && (
          <>
            <div
              className="border-warning/20 pointer-events-none absolute inset-x-0 top-0 border-t-[0.5px]"
              style={{
                position: 'absolute',
                height: '100%',
                background: 'linear-gradient(to bottom, hsl(var(--warning) / 0.08), transparent 4%)',
                transition: 'border 0.3s ease-in-out, background 0.3s ease-in-out',
              }}
            />
            <div className="absolute left-4 top-4 z-50">
              <InlineToast
                className="bg-warning/10 border shadow-md"
                variant={'warning'}
                description="Content visible but locked for editing. Contact an admin for edit access."
                title="View-only mode: "
              />
            </div>
          </>
        )}
      </div>
    </ReactFlowProvider>
  );
};
