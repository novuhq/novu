import { Center } from '@mantine/core';

import { Variant, VariantsFile } from '../../../design-system/icons';
import { Text, colors } from '../../../design-system';
import { useStepInfoPath } from '../hooks/useStepInfoPath';
import { useStepIndex } from '../hooks/useStepIndex';

export const StepNameLabel = ({ variantsCount = 0 }: { variantsCount?: number }) => {
  const { variantIndex } = useStepIndex();
  const { isUnderTheStepPath, isUnderVariantPath } = useStepInfoPath();

  if (isUnderTheStepPath) {
    return null;
  }

  const variantNumber = variantIndex ? variantIndex + 1 : 1;
  const text = isUnderVariantPath ? `Variant ${variantNumber}` : `${variantsCount} variants`;

  return (
    <Center inline>
      {isUnderVariantPath ? <Variant /> : <VariantsFile />}
      <Text ml={4} color={colors.B60}>
        {text}
      </Text>
    </Center>
  );
};
