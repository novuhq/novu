import { useStepIndex } from './useStepIndex';

export const useStepFormPath = () => {
  const { stepIndex, variantIndex } = useStepIndex();

  return typeof variantIndex !== 'undefined' && variantIndex > -1
    ? (`steps.${stepIndex}.variants.${variantIndex}` as `steps.${number}.variants.${number}`)
    : (`steps.${stepIndex}` as `steps.${number}`);
};
