import { Badge, BadgeContent } from '@/components/primitives/badge';
import { badgeContentVariants, badgeVariants } from '@/components/primitives/variants';
import { WorkflowStatusEnum } from '@/utils/enums';

type WorkflowStatusProps = {
  status: WorkflowStatusEnum;
};

const statusRenderData: Record<
  WorkflowStatusEnum,
  {
    badgeVariant: NonNullable<Parameters<typeof badgeVariants>[0]>['variant'];
    badgeContentVariant: NonNullable<Parameters<typeof badgeContentVariants>[0]>['variant'];
    text: string;
  }
> = {
  [WorkflowStatusEnum.ACTIVE]: { badgeVariant: 'success-light', badgeContentVariant: 'success', text: 'Active' },
  [WorkflowStatusEnum.INACTIVE]: { badgeVariant: 'warning-light', badgeContentVariant: 'warning', text: 'Inactive' },
  [WorkflowStatusEnum.ERROR]: {
    badgeVariant: 'destructive-light',
    badgeContentVariant: 'destructive',
    text: 'Action required',
  },
};

export const WorkflowStatus = (props: WorkflowStatusProps) => {
  const { status } = props;
  const badgeVariant = statusRenderData[status].badgeVariant;
  const badgeContentVariant = statusRenderData[status].badgeContentVariant;

  return (
    <Badge variant={badgeVariant}>
      <BadgeContent variant={badgeContentVariant}>{statusRenderData[status].text}</BadgeContent>
    </Badge>
  );
};
