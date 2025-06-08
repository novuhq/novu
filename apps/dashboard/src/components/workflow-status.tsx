import { WorkflowStatusEnum } from '@/utils/enums';
import { ComponentProps } from 'react';
import { type IconType } from 'react-icons/lib';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiForbidFill } from 'react-icons/ri';
import { StatusBadge, StatusBadgeIcon } from './primitives/status-badge';

type WorkflowStatusProps = {
  status: WorkflowStatusEnum;
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
  const { status } = props;
  const badgeVariant = statusRenderData[status].badgeVariant;
  const Icon = statusRenderData[status].icon;
  const text = statusRenderData[status].text;

  return (
    <StatusBadge variant="light" status={badgeVariant}>
      <StatusBadgeIcon as={Icon} /> {text}
    </StatusBadge>
  );
};
