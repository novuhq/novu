import { useFormContext } from 'react-hook-form';

import { IForm } from '../components/formTypes';
import { useStepIndex } from './useStepIndex';

export const useStepVariantsCount = () => {
  const { watch } = useFormContext<IForm>();
  const { stepIndex } = useStepIndex();
  const step = watch(`steps.${stepIndex}`);

  return {
    variantsCount: step?.variants?.length || 0,
  };
};
