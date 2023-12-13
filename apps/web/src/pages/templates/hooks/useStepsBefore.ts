import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { IForm } from '../components/formTypes';

export const useStepsBefore = ({ index = 0 }: { index?: number }) => {
  const { control } = useFormContext<IForm>();
  const steps = useWatch({ name: 'steps', control });

  const stepsBefore = useMemo(() => {
    const stepsBeforeSelectedStep = steps.slice(0, index);

    return stepsBeforeSelectedStep.filter((step) => {
      return [ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(step.template.type as unknown as ChannelTypeEnum);
    });
  }, [steps, index]);

  return stepsBefore;
};
