import { IEnvironment, ResourceOriginEnum, Slug, WorkflowResponseDto } from '@novu/shared';
import { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFirstErrorMessage } from '@/components/workflow-editor/step-utils';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { generateUUID } from '@/utils/uuid';
import { NODE_HEIGHT, NODE_WIDTH } from './base-node';
import { AddNodeEdge, AddNodeEdgeType, DefaultEdge } from './edges';
import {
  AddNode,
  ChatNode,
  CustomNode,
  DelayNode,
  DigestNode,
  EmailNode,
  HttpRequestNode,
  InAppNode,
  NodeData,
  PushNode,
  SmsNode,
  ThrottleNode,
  TriggerNode,
} from './nodes';

// y distance = node height + space between nodes
const NODE_Y_OFFSET = 50;
const Y_DISTANCE = NODE_HEIGHT + 50;

export const nodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  sms: SmsNode,
  in_app: InAppNode,
  push: PushNode,
  chat: ChatNode,
  delay: DelayNode,
  digest: DigestNode,
  throttle: ThrottleNode,
  custom: CustomNode,
  http_request: HttpRequestNode,
  add: AddNode,
};

export const NODE_TYPE_TO_STEP_TYPE: Omit<Record<keyof typeof nodeTypes, StepTypeEnum>, 'add'> = {
  trigger: StepTypeEnum.TRIGGER,
  email: StepTypeEnum.EMAIL,
  sms: StepTypeEnum.SMS,
  in_app: StepTypeEnum.IN_APP,
  push: StepTypeEnum.PUSH,
  chat: StepTypeEnum.CHAT,
  delay: StepTypeEnum.DELAY,
  digest: StepTypeEnum.DIGEST,
  throttle: StepTypeEnum.THROTTLE,
  custom: StepTypeEnum.CUSTOM,
  http_request: StepTypeEnum.HTTP_REQUEST,
};

export const edgeTypes = {
  addNode: AddNodeEdge,
  default: DefaultEdge,
};

export const mapStepToNodeContent = (
  stepType: StepTypeEnum,
  controlValues: Record<string, unknown>,
  workflowOrigin: ResourceOriginEnum,
  stepResolverHash?: string
): string => {
  if (stepResolverHash) {
    switch (stepType) {
      case StepTypeEnum.DELAY:
        return 'Delay duration controlled by code';
      case StepTypeEnum.DIGEST:
        return 'Digest window controlled by code';
      case StepTypeEnum.THROTTLE:
        return 'Throttle rules controlled by code';
      default:
        break;
    }
  }

  switch (stepType) {
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
    case StepTypeEnum.DELAY: {
      const delayMessage =
        workflowOrigin === ResourceOriginEnum.EXTERNAL
          ? 'Delay duration defined in code'
          : controlValues.dynamicKey
            ? `Delay based on ${controlValues.dynamicKey} variable`
            : controlValues.cron
              ? `Delay until the scheduled time`
              : `Delay for ${controlValues.amount} ${controlValues.unit}`;

      return delayMessage;
    }
    case StepTypeEnum.DIGEST:
      return 'Batches events into one coherent message before delivery to the subscriber.';
    case StepTypeEnum.THROTTLE:
      return 'Limits the number of workflow executions within a specified time window.';
    case StepTypeEnum.HTTP_REQUEST:
      return 'Send or receive data by calling an external API';
    case StepTypeEnum.CUSTOM:
      return 'Executes the business logic in your bridge application';
    default:
      return '';
  }
};

export const recalculatePositionAndIndex = (
  nodes: Node<NodeData, keyof typeof nodeTypes>[],
  containerWidth?: number
) => {
  const middleX = containerWidth ? containerWidth / 2 - NODE_WIDTH / 2 : 0;
  const position = { x: middleX, y: NODE_Y_OFFSET };

  return nodes.map((node, index) => {
    const newNode = {
      ...node,
      position: { ...position },
      data: {
        ...node.data,
        index,
      },
    };

    position.y += Y_DISTANCE;

    return newNode;
  });
};

export const createNode = ({
  x,
  y,
  name,
  content,
  index,
  stepSlug,
  error,
  controlValues,
  isPending,
  type,
  stepResolverHash,
}: {
  x: number;
  y: number;
  name: string;
  content: string;
  index: number;
  stepSlug?: Slug;
  error: string;
  controlValues: Record<string, unknown>;
  isPending?: boolean;
  type: StepTypeEnum;
  stepResolverHash?: string;
}): Node<NodeData, keyof typeof nodeTypes> => {
  return {
    id: generateUUID(),
    position: { x, y: y + Y_DISTANCE },
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: {
      name,
      content,
      index,
      stepSlug,
      error,
      controlValues,
      isPending,
      stepResolverHash,
    },
    type,
  };
};

export const mapStepToNode = ({
  index,
  previousPosition,
  step,
  workflowOrigin = ResourceOriginEnum.NOVU_CLOUD,
}: {
  index: number;
  previousPosition: { x: number; y: number };
  step: Step;
  workflowOrigin?: ResourceOriginEnum;
}): Node<NodeData, keyof typeof nodeTypes> => {
  const content = mapStepToNodeContent(step.type, step.controls.values, workflowOrigin, step.stepResolverHash);

  const error = step.issues
    ? getFirstErrorMessage(step.issues, 'controls') || getFirstErrorMessage(step.issues, 'integration')
    : undefined;

  return createNode({
    x: previousPosition.x,
    y: previousPosition.y,
    name: step.name,
    content: content ?? '',
    index,
    stepSlug: step.slug,
    error: error?.message ?? '',
    controlValues: step.controls.values,
    type: step.type,
    stepResolverHash: step.stepResolverHash,
  });
};

export const createEdges = (nodes: Node<NodeData, keyof typeof nodeTypes>[], showStepPreview?: boolean) => {
  return nodes.reduce<AddNodeEdgeType[]>((acc, node, index) => {
    if (index === 0) {
      return acc;
    }

    const parent = nodes[index - 1];

    acc.push({
      id: `edge-${parent.id}-${node.id}`,
      source: parent.id,
      sourceHandle: 'b',
      targetHandle: 'a',
      target: node.id,
      type: showStepPreview ? 'default' : 'addNode',
      style: {
        stroke: 'hsl(var(--neutral-alpha-200))',
        strokeWidth: 2,
        strokeDasharray: 5,
      },
      data: showStepPreview
        ? undefined
        : {
            isLast: index === nodes.length - 1,
            addStepIndex: index - 1,
          },
    });

    return acc;
  }, []);
};

export const createTriggerNode = (
  currentWorkflow?: WorkflowResponseDto,
  currentEnvironment?: IEnvironment,
  containerWidth?: number
) => {
  const middleX = containerWidth ? containerWidth / 2 - NODE_WIDTH / 2 : 0;
  const id = generateUUID();
  const triggerNode: Node<NodeData, 'trigger'> = {
    id,
    position: { x: middleX, y: 50 },
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: {
      index: 0,
      triggerLink: buildRoute(ROUTES.TRIGGER_WORKFLOW, {
        environmentSlug: currentEnvironment?.slug ?? '',
        workflowSlug: currentWorkflow?.slug ?? '',
      }),
    },
    type: 'trigger',
  };
  return triggerNode;
};

export const createAddNode = (
  previousPosition: { x: number; y: number },
  allNodes: Node<NodeData, keyof typeof nodeTypes>[]
) => {
  const addNodeId = generateUUID();
  const addNode: Node<NodeData, 'add'> = {
    id: addNodeId,
    position: { ...previousPosition, y: previousPosition.y + Y_DISTANCE },
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: {
      index: allNodes.length,
    },
    type: 'add',
  };
  return addNode;
};

const createNodes = (
  steps: Step[],
  currentWorkflow?: WorkflowResponseDto,
  currentEnvironment?: IEnvironment,
  containerWidth?: number
) => {
  const triggerNode = createTriggerNode(currentWorkflow, currentEnvironment, containerWidth);
  let previousPosition = triggerNode.position;

  const createdNodes = steps?.map((step, index) => {
    const node = mapStepToNode({
      step,
      previousPosition,
      index: index + 1, // +1 because we have the trigger node
      workflowOrigin: currentWorkflow?.origin,
    });
    previousPosition = node.position;
    return node;
  });

  const allNodes: Node<NodeData, keyof typeof nodeTypes>[] = [triggerNode, ...createdNodes];

  const addNode = createAddNode(previousPosition, allNodes);

  return [...allNodes, addNode];
};

const generateNodesAndEdges = (
  steps: Step[],
  showStepPreview?: boolean,
  currentWorkflow?: WorkflowResponseDto,
  currentEnvironment?: IEnvironment,
  containerWidth?: number
): { nodes: Node<NodeData, keyof typeof nodeTypes>[]; edges: AddNodeEdgeType[] } => {
  const nodes = createNodes(steps, currentWorkflow, currentEnvironment, containerWidth);

  return {
    nodes,
    edges: createEdges(nodes, showStepPreview),
  };
};
