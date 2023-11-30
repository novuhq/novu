import { useFormContext } from 'react-hook-form';
import { IForm } from '../components/formTypes';
import { useStepIndex } from './useStepIndex';

export const useStepFormErrors = () => {
  const { stepIndex, variantIndex } = useStepIndex();
  const {
    formState: { errors },
  } = useFormContext<IForm>();

  const hasVariant = typeof variantIndex !== 'undefined' && variantIndex > -1;
  const stepErrors = errors.steps;

  if (!stepErrors) {
    return undefined;
  }

  const variantErrors = stepErrors[stepIndex]?.variants;
  if (hasVariant) {
    return variantErrors ? variantErrors[variantIndex] : {};
  }

  return stepErrors[stepIndex];
};
