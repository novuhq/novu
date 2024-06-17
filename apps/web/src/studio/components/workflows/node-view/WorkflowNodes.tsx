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
} from '@novu/novui/icons';

export interface WorkflowNodesProps {
  steps: any[];
  onClick: (step: any) => void;
}

export function WorkflowNodes({ steps, onClick }: WorkflowNodesProps) {
  return (
    <>
      <VStack gap="0">
        <StepNode icon={<IconOutlineBolt size="32" />} title={'Workflow trigger'} />
        {steps?.map((step) => {
          const handleStepClick = () => {
            onClick(step);
          };

          switch (step.type) {
            case 'email':
              return <StepNode icon={<IconOutlineEmail size="32" />} title={step.stepId} onClick={handleStepClick} />;
            case 'in_app':
              return (
                <StepNode icon={<IconOutlineNotifications size="32" />} title={step.stepId} onClick={handleStepClick} />
              );
            case 'sms':
              return <StepNode icon={<IconOutlineSms size="32" />} title={step.stepId} onClick={handleStepClick} />;
            case 'chat':
              return <StepNode icon={<IconOutlineForum size="32" />} title={step.stepId} onClick={handleStepClick} />;
            case 'push':
              return (
                <StepNode
                  icon={<IconOutlineMobileFriendly size="32" />}
                  title={step.stepId}
                  onClick={handleStepClick}
                />
              );
            case 'digest':
              return (
                <StepNode
                  icon={<IconOutlineAutoAwesomeMotion size="32" />}
                  title={step.stepId}
                  onClick={handleStepClick}
                />
              );
            case 'delay':
              return <StepNode icon={<IconOutlineAvTimer size="32" />} title={step.stepId} onClick={handleStepClick} />;
            case 'custom':
              return <StepNode icon={<IconOutlineBolt size="32" />} title={step.stepId} onClick={handleStepClick} />;
          }
        })}
      </VStack>
    </>
  );
}
