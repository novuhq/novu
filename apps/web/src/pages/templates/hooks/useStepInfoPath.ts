import { useLocation } from 'react-router-dom';

import { useStepIndex } from './useStepIndex';

export const useStepInfoPath = () => {
  const { pathname } = useLocation();
  const { stepIndex, variantIndex } = useStepIndex();
  const isStep = stepIndex > -1;
  const isVariant = typeof variantIndex !== 'undefined' && variantIndex > -1;
  const isUnderVariantsListPath = pathname.includes('/variants') && pathname.endsWith('/preview');
  const isUnderTheStepPath = isStep && !isVariant && !isUnderVariantsListPath;
  const isUnderVariantPath = isStep && isVariant && !isUnderVariantsListPath;

  return {
    isUnderTheStepPath,
    isUnderVariantsListPath,
    isUnderVariantPath,
  };
};
