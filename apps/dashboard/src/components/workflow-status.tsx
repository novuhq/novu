import { Badge, badgeVariants } from '@/components/primitives/badge';
import { WorkflowStatusEnum } from '@novu/shared';

type WorkflowStatusProps = {
  status: WorkflowStatusEnum;
};

const statusRenderData: Record<
  WorkflowStatusEnum,
  { variant: NonNullable<Parameters<typeof badgeVariants>[0]>['variant']; text: string }
> = {
  [WorkflowStatusEnum.ACTIVE]: { variant: 'success', text: 'Active' },
  [WorkflowStatusEnum.INACTIVE]: { variant: 'warning', text: 'Inactive' },
  [WorkflowStatusEnum.ERROR]: { variant: 'destructive', text: 'Action required' },
};

export const WorkflowStatus = (props: WorkflowStatusProps) => {
  const { status } = props;

  return <Badge variant={statusRenderData[status].variant}>{statusRenderData[status].text}</Badge>;
};
