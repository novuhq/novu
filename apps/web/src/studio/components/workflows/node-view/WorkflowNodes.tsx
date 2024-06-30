import { VStack } from '@novu/novui/jsx';
import { StepNode } from './StepNode';
import {
  IconOutlineAutoAwesomeMotion,
  IconOutlineAvTimer,
  IconOutlineBolt,
  IconOutlineEmail,
  IconOutlineForum,
  IconOutlineMobileFriendly,
  IconOutlineNotifications,
  IconOutlineSms,
  IconSize,
  IconType,
} from '@novu/novui/icons';
import { BridgeWorkflowStepType } from '../../../types';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';

export interface WorkflowNodesProps {
  // TODO: add proper types
  steps: any[];
  onStepClick: (step: any) => void;
  onTriggerClick: () => void;
}

export const WORKFLOW_NODE_STEP_ICON_DICTIONARY: Record<BridgeWorkflowStepType, IconType> = {
  email: IconOutlineEmail,
  in_app: IconOutlineNotifications,
  sms: IconOutlineSms,
  chat: IconOutlineForum,
  push: IconOutlineMobileFriendly,
  digest: IconOutlineAutoAwesomeMotion,
  delay: IconOutlineAvTimer,
  custom: IconOutlineBolt,
};

const STEP_TYPE_ICON_SIZE: IconSize = '32';

export function WorkflowNodes({ steps, onStepClick, onTriggerClick }: WorkflowNodesProps) {
  return (
    <>
      <VStack gap="0">
        <StepNode
          icon={<IconOutlineBolt size={STEP_TYPE_ICON_SIZE} />}
          title={'Workflow trigger'}
          onClick={onTriggerClick}
        />
        {steps?.map((step) => {
          const handleStepClick = () => {
            onStepClick(step);
          };

          const Icon = WORKFLOW_NODE_STEP_ICON_DICTIONARY[step.type];

          return (
            <StepNode
              key={step.stepId}
              icon={<Icon size={STEP_TYPE_ICON_SIZE} />}
              title={step.stepId}
              onClick={handleStepClick}
            />
          );
        })}
      </VStack>
    </>
  );
}

WorkflowNodes.LoadingDisplay = () => {
  return (
    <WorkflowBackgroundWrapper>
      <VStack gap="0" p="75">
        <StepNode.LoadingDisplay />
        <StepNode.LoadingDisplay />
        <StepNode.LoadingDisplay />
      </VStack>
    </WorkflowBackgroundWrapper>
  );
};
