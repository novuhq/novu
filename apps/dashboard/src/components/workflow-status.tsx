import { ComponentProps } from 'react';
import { type IconType } from 'react-icons/lib';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiForbidFill } from 'react-icons/ri';
import { WorkflowStatusEnum } from '@/utils/enums';
import { StatusBadge, StatusBadgeIcon } from './primitives/status-badge';
import { WorkflowIssuesPopover } from './workflow-issues-popover';

// Local type definition for step issues until the shared types are updated
type RuntimeIssue = {
  message: string;
  variableName?: string;
  issueType: string;
};

type StepIssue = {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
};

type StepListItem = {
  slug: string;
  type: string;
  issues?: StepIssue;
};

type WorkflowStatusProps = {
  status: WorkflowStatusEnum;
  steps?: StepListItem[];
};

const statusRenderData: Record<
  WorkflowStatusEnum,
  {
    badgeVariant: ComponentProps<typeof StatusBadge>['status'];
    text: string;
    icon: IconType;
  }
> = {
  [WorkflowStatusEnum.ACTIVE]: {
    badgeVariant: 'completed',
    text: 'Active',
    icon: RiCheckboxCircleFill,
  },
  [WorkflowStatusEnum.INACTIVE]: {
    badgeVariant: 'disabled',
    text: 'Inactive',
    icon: RiForbidFill,
  },
  [WorkflowStatusEnum.ERROR]: {
    badgeVariant: 'failed',
    text: 'Action required',
    icon: RiErrorWarningFill,
  },
};

export const WorkflowStatus = (props: WorkflowStatusProps) => {
  const { status, steps = [] } = props;
  const badgeVariant = statusRenderData[status].badgeVariant;
  const Icon = statusRenderData[status].icon;
  const text = statusRenderData[status].text;

  const statusBadge = (
    <StatusBadge variant="light" status={badgeVariant}>
      <StatusBadgeIcon as={Icon} /> {text}
    </StatusBadge>
  );

  // Show popover only for ERROR status and when there are steps with issues
  if (status === WorkflowStatusEnum.ERROR && steps.length > 0) {
    return <WorkflowIssuesPopover steps={steps}>{statusBadge}</WorkflowIssuesPopover>;
  }

  return statusBadge;
};
