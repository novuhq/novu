import { Center } from '@mantine/core';
import { ArrowLeft } from '../../../../design-system/icons';
import { colors, Text } from '../../../../design-system';

export function GoBack({ goBackHandler, display = true }: { goBackHandler: () => void; display?: boolean }) {
  return (
    <Center
      data-test-id="go-back-button"
      onClick={() => goBackHandler()}
      inline
      style={{ cursor: 'pointer', visibility: display ? 'visible' : 'hidden' }}
    >
      <ArrowLeft color={colors.B60} />
      <Text ml={5} color={colors.B60}>
        Go Back
      </Text>
    </Center>
  );
}
