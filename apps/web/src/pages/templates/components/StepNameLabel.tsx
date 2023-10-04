import { Center } from '@mantine/core';
import { useLocation } from 'react-router-dom';

import { Variant, VariantsFile } from '../../../design-system/icons';
import { Text, colors } from '../../../design-system';
import { useStepIndex } from '../hooks/useStepIndex';

export const StepNameLabel = ({ variantsCount = 0 }: { variantsCount?: number }) => {
  const { pathname } = useLocation();
  const { stepIndex, variantIndex } = useStepIndex();
  const isStep = stepIndex > -1;
  const isVariant = typeof variantIndex !== 'undefined' && variantIndex > -1;
  const isVariantsListPath = pathname.endsWith('/variants');
  const isUnderTheStepPath = isStep && !isVariant && !isVariantsListPath;

  if (isUnderTheStepPath) {
    return null;
  }

  const variantNumber = variantIndex ? variantIndex + 1 : 1;
  const text = isVariant ? `Variant ${variantNumber}` : `${variantsCount} variants`;

  return (
    <Center inline>
      {isVariant ? <Variant /> : <VariantsFile />}
      <Text ml={4} color={colors.B60}>
        {text}
      </Text>
    </Center>
  );
};
