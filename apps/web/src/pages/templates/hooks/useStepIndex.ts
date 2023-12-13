import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';

import { IForm } from '../components/formTypes';

export const useStepIndex = () => {
  const {
    channel,
    stepUuid = '',
    variantUuid = '',
  } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
    variantUuid: string;
  }>();

  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');

  const step = useMemo(
    () => steps.find((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );

  const stepIndex = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );

  const variantIndex = useMemo(() => {
    if (!step) {
      return undefined;
    }

    return step.variants?.findIndex((message) => message.uuid === variantUuid);
  }, [step, variantUuid]);

  return {
    step,
    stepIndex,
    variantIndex,
  };
};
