import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { IForm } from '../components/formTypes';
import { useStepIndex } from './useStepIndex';

export const useStepVariantsCount = () => {
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');

  const { stepIndex } = useStepIndex();
  const variantsCount = useMemo(() => {
    const step = steps[stepIndex];

    return step?.variants?.length || 0;
  }, [stepIndex, steps]);

  return {
    variantsCount,
  };
};
