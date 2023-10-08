import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { IForm } from '../components/formTypes';
import { useStepIndex } from './useStepIndex';

export const useStepsBefore = () => {
  const { stepIndex } = useStepIndex();
  const { control } = useFormContext<IForm>();
  const steps = useWatch({ name: 'steps', control });

  const stepsBefore = useMemo(() => {
    const stepsBeforeSelectedStep = steps.slice(0, stepIndex);

    return stepsBeforeSelectedStep.filter((step) => {
      return [ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(step.template.type as unknown as ChannelTypeEnum);
    });
  }, [steps, stepIndex]);

  return stepsBefore;
};
