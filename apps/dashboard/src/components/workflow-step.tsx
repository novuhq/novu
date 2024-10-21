import { Step, StepProps } from '@/components/primitives/step';
import { stepVariants } from '@/components/primitives/variants';
import { IconType } from 'react-icons/lib';
import { STEP_TYPE_TO_ICON } from './icons/utils';
import { StepTypeEnum } from '@/utils/enums';

type WorkflowStepProps = StepProps & {
  step: StepTypeEnum;
};

const stepRenderData: Record<
  StepTypeEnum,
  { variant: NonNullable<Parameters<typeof stepVariants>[0]>['variant']; icon: IconType }
> = {
  [StepTypeEnum.CHAT]: { variant: 'feature', icon: STEP_TYPE_TO_ICON[StepTypeEnum.CHAT] },
  [StepTypeEnum.CUSTOM]: { variant: 'alert', icon: STEP_TYPE_TO_ICON[StepTypeEnum.CUSTOM] },
  [StepTypeEnum.DELAY]: { variant: 'warning', icon: STEP_TYPE_TO_ICON[StepTypeEnum.DELAY] },
  [StepTypeEnum.DIGEST]: { variant: 'highlighted', icon: STEP_TYPE_TO_ICON[StepTypeEnum.DIGEST] },
  [StepTypeEnum.EMAIL]: { variant: 'information', icon: STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL] },
  [StepTypeEnum.IN_APP]: { variant: 'stable', icon: STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP] },
  [StepTypeEnum.PUSH]: { variant: 'verified', icon: STEP_TYPE_TO_ICON[StepTypeEnum.PUSH] },
  [StepTypeEnum.SMS]: { variant: 'destructive', icon: STEP_TYPE_TO_ICON[StepTypeEnum.SMS] },
  [StepTypeEnum.TRIGGER]: { variant: 'neutral', icon: STEP_TYPE_TO_ICON[StepTypeEnum.TRIGGER] },
};

export const WorkflowStep = (props: WorkflowStepProps) => {
  const { step, ...rest } = props;
  const Icon = stepRenderData[step].icon;

  return (
    <Step variant={stepRenderData[step].variant} {...rest}>
      <Icon />
    </Step>
  );
};
