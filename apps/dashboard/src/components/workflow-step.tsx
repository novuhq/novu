import { Step, StepProps, stepVariants } from '@/components/primitives/step';
import { StepTypeEnum } from '@novu/shared';
import { IconType } from 'react-icons/lib';
import {
  RiChatThreadFill,
  RiRocket2Fill,
  RiHourglassFill,
  RiShadowLine,
  RiMailOpenFill,
  RiInbox2Fill,
  RiCellphoneFill,
  RiFlashlightFill,
} from 'react-icons/ri';
import { FaSms } from 'react-icons/fa';

type WorkflowStepProps = StepProps & {
  step: StepTypeEnum;
};

const stepRenderData: Record<
  StepTypeEnum,
  { variant: NonNullable<Parameters<typeof stepVariants>[0]>['variant']; icon: IconType }
> = {
  [StepTypeEnum.CHAT]: { variant: 'feature', icon: RiChatThreadFill },
  [StepTypeEnum.CUSTOM]: { variant: 'stable', icon: RiRocket2Fill },
  [StepTypeEnum.DELAY]: { variant: 'feature', icon: RiHourglassFill },
  [StepTypeEnum.DIGEST]: { variant: 'highlighted', icon: RiShadowLine },
  [StepTypeEnum.EMAIL]: { variant: 'information', icon: RiMailOpenFill },
  [StepTypeEnum.IN_APP]: { variant: 'feature', icon: RiInbox2Fill },
  [StepTypeEnum.PUSH]: { variant: 'verified', icon: RiCellphoneFill },
  [StepTypeEnum.SMS]: { variant: 'destructive', icon: FaSms },
  [StepTypeEnum.TRIGGER]: { variant: 'default', icon: RiFlashlightFill },
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
