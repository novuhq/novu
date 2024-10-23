import { css } from '@novu/novui/css';
import { IconBolt } from '@novu/novui/icons';
import { FC } from 'react';
import type { DiscoverWorkflowOutput } from '@novu/framework/internal';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../../studio/components/workflows/node-view/WorkflowNodes';
import {
  getStudioWorkflowLink,
  getStudioWorkflowStepLink,
  getStudioWorkflowTestLink,
} from '../../../../studio/utils/routing';
import { NavMenuLinkButton, NavMenuToggleButton } from '../../../nav/NavMenuButton';

type LocalStudioSidebarToggleButtonProps = {
  workflow: DiscoverWorkflowOutput;
};

const linkButtonClassName = css({ padding: '75', _before: { display: 'none' } });

export const LocalStudioSidebarToggleButton: FC<LocalStudioSidebarToggleButtonProps> = ({ workflow }) => {
  const { workflowId, name, steps } = workflow;

  return (
    <NavMenuToggleButton label={name || workflowId} icon={null} link={getStudioWorkflowLink(workflowId)}>
      <NavMenuLinkButton
        label={'Trigger'}
        link={getStudioWorkflowTestLink(workflowId)}
        icon={<IconBolt size="20" />}
        className={linkButtonClassName}
      />
      {steps.map(({ stepId, type }) => {
        const Icon = WORKFLOW_NODE_STEP_ICON_DICTIONARY[type];

        return (
          <NavMenuLinkButton
            key={`${workflowId}-${stepId}`}
            label={stepId}
            link={getStudioWorkflowStepLink(workflowId, stepId)}
            icon={<Icon size="20" title="studio-workflow-step-icon" />}
            className={linkButtonClassName}
          />
        );
      })}
    </NavMenuToggleButton>
  );
};
