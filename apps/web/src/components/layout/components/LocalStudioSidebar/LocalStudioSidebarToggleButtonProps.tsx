import { IconBolt } from '@novu/novui/icons';
import { FC } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../../studio/components/workflows/node-view/WorkflowNodes';
import { IBridgeWorkflow, IBridgeWorkflowStep } from '../../../../studio/types';
import { NavMenuLinkButton } from '../../../nav/NavMenuButton/NavMenuLinkButton';
import { NavMenuToggleButton } from '../../../nav/NavMenuButton/NavMenuToggleButton';

type LocalStudioSidebarToggleButtonProps = {
  workflow: IBridgeWorkflow;
};

export const LocalStudioSidebarToggleButton: FC<LocalStudioSidebarToggleButtonProps> = ({ workflow }) => {
  const { workflowId, steps } = workflow;

  return (
    <NavMenuToggleButton label={workflowId} icon={null}>
      <NavMenuLinkButton label={'Trigger'} link={getTriggerLink(workflow)} icon={<IconBolt size="20" />} />
      {steps.map((step) => {
        const { stepId, type } = step;
        const Icon = WORKFLOW_NODE_STEP_ICON_DICTIONARY[type];

        return (
          <NavMenuLinkButton
            key={`${workflowId}-${stepId}`}
            label={stepId}
            link={getLinkFromWorkflowStep(workflowId, step)}
            icon={<Icon size="20" title="studio-workflow-step-icon" />}
          />
        );
      })}
    </NavMenuToggleButton>
  );
};

// TODO: just an example
function getTriggerLink({ workflowId }: IBridgeWorkflow) {
  return `/studio/${workflowId}/trigger`;
}

// TODO: just an example
function getLinkFromWorkflowStep(workflowId: string, step: IBridgeWorkflowStep) {
  return `/studio/${workflowId}/steps/${step.stepId}`;
}
