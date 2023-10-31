import { Center } from '@mantine/core';

import { ArrowLeft } from '../icons';
import { colors } from '../config';
import { Text } from '../typography/text/Text';

export function ArrowButton({
  label,
  onClick,
  display = true,
  testId,
}: {
  label: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  display?: boolean;
  testId?: string;
}) {
  return (
    <Center
      onClick={onClick}
      role="button"
      inline
      style={{ cursor: 'pointer', visibility: display ? 'visible' : 'hidden' }}
      data-test-id={testId}
    >
      <ArrowLeft color={colors.B60} />
      <Text ml={5} color={colors.B60}>
        {label}
      </Text>
    </Center>
  );
}
