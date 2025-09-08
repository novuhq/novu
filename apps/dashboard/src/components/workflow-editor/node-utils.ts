import { IEnvironment, ResourceOriginEnum, WorkflowResponseDto } from '@novu/shared';
import { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFirstErrorMessage } from '@/components/workflow-editor/step-utils';
import { StepTypeEnum } from '@/utils/enums';
import { Step } from '@/utils/types';
import { generateUUID } from '@/utils/uuid';
import { NODE_HEIGHT } from './base-node';
import { AddNodeEdge, AddNodeEdgeType, DefaultEdge } from './edges';
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
import { OptimisticStep } from './use-optimistic-workflow';

// y distance = node height + space between nodes
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
  custom: CustomNode,
  add: AddNode,
};

export const edgeTypes = {
  addNode: AddNodeEdge,
  default: DefaultEdge,
};

const mapStepToNodeContent = (step: Step, workflowOrigin: ResourceOriginEnum): string | undefined => {
  const controlValues = step.controls.values;
  const delayMessage =
    workflowOrigin === ResourceOriginEnum.EXTERNAL
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
  workflowOrigin = ResourceOriginEnum.NOVU_CLOUD,
  isTemplateStorePreview,
}: {
  addStepIndex: number;
  previousPosition: { x: number; y: number };
  step: Step;
  workflowOrigin?: ResourceOriginEnum;
  isTemplateStorePreview?: boolean;
}): Node<NodeData, keyof typeof nodeTypes> => {
  const content = mapStepToNodeContent(step, workflowOrigin);

  const error = step.issues
    ? getFirstErrorMessage(step.issues, 'controls') || getFirstErrorMessage(step.issues, 'integration')
    : undefined;

  return {
    // the random id is used to identify the node and to be able to re-render the nodes and edges
    id: generateUUID(),
    position: { x: previousPosition.x, y: previousPosition.y + Y_DISTANCE },
    data: {
      stepId: step._id,
      name: step.name,
      content,
      addStepIndex,
      stepSlug: step.slug,
      error: error?.message,
      controlValues: step.controls.values,
      isTemplateStorePreview,
      optimisticStep: (step as OptimisticStep)?._optimistic ? (step as OptimisticStep) : undefined,
    },
    type: step.type,
  };
};

export const generateNodesAndEdges = (
  steps: Step[],
  isTemplateStorePreview: boolean,
  currentWorkflow?: WorkflowResponseDto,
  currentEnvironment?: IEnvironment
): { nodes: Node<NodeData, keyof typeof nodeTypes>[]; edges: AddNodeEdgeType[] } => {
  const id = generateUUID();
  const triggerNode: Node<NodeData, 'trigger'> = {
    id,
    position: { x: 0, y: 0 },
    data: {
      stepId: id,
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

  const addNodeId = generateUUID();
  const addNode: Node<NodeData, 'add'> = {
    id: addNodeId,
    position: { ...previousPosition, y: previousPosition.y + Y_DISTANCE },
    data: {
      stepId: addNodeId,
    },
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

  return { nodes: allNodes, edges };
};
