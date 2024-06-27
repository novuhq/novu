import { IconBolt } from '@novu/novui/icons';
import { FC } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../../studio/components/workflows/node-view/WorkflowNodes';
import { IBridgeWorkflow, IBridgeWorkflowStep } from '../../../../studio/types';
import { NavMenuToggleButton, NavMenuLinkButton } from '../../../nav/NavMenuButton';
import { ROUTES } from '../../../../constants/routes';
import { parseUrl } from '../../../../utils/routeUtils';

type LocalStudioSidebarToggleButtonProps = {
  workflow: IBridgeWorkflow;
};

export const LocalStudioSidebarToggleButton: FC<LocalStudioSidebarToggleButtonProps> = ({ workflow }) => {
  const { workflowId, steps } = workflow;

  return (
    <NavMenuToggleButton label={workflowId} icon={null} link={getLinkFromWorkflow(workflowId)}>
      <NavMenuLinkButton label={'Trigger'} link={getTriggerLink(workflowId)} icon={<IconBolt size="20" />} />
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

function getTriggerLink(workflowId: string) {
  return parseUrl(ROUTES.STUDIO_FLOWS_TEST, { templateId: workflowId });
}
function getLinkFromWorkflow(workflowId: string) {
  return parseUrl(ROUTES.STUDIO_FLOWS_VIEW, { templateId: workflowId });
}

function getLinkFromWorkflowStep(workflowId: string, step: IBridgeWorkflowStep) {
  return parseUrl(ROUTES.STUDIO_FLOWS_STEP_EDITOR, {
    templateId: workflowId,
    stepId: step.stepId,
  });
}
