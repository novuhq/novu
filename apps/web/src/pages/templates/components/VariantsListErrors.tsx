import styled from '@emotion/styled';
import { ActionIcon, Divider, Group } from '@mantine/core';
import { ChevronPlainDown, colors, ErrorIcon, Text } from '@novu/design-system';

import { When } from '../../../components/utils/When';

const ChevronPlainUp = styled(ChevronPlainDown)`
  transform: rotate(180deg);
`;

interface IVariantsListErrorsProps {
  error: {
    errorMessage?: string;
    errorIndex?: number;
  };
  errorsCount: number;
  onErrorMessageClick: () => void;
  onErrorUp: () => void;
  onErrorDown: () => void;
}

export const VariantsListErrors: React.FC<IVariantsListErrorsProps> = ({
  error,
  errorsCount,
  onErrorMessageClick,
  onErrorUp,
  onErrorDown,
}) => {
  return (
    <When truthy={error}>
      <Group position="apart" px={12} mt={10} mb={10}>
        <Group position="left" spacing={4} onClick={onErrorMessageClick} sx={{ cursor: 'pointer' }}>
          <ErrorIcon color={colors.error} width="16px" height="16px" />
          <Text color={colors.error} data-test-id="variants-list-current-error">
            {error?.errorMessage || ''}
          </Text>
        </Group>
        <Group position="left" spacing={20}>
          <Text color={colors.error} data-test-id="variants-list-errors-count">
            {(error?.errorIndex ?? 0) + 1}/{errorsCount}
          </Text>
          <Divider orientation="vertical" size="sm" color="#ffffff33" />
          <ActionIcon color="gray" radius="xl" size="xs" onClick={onErrorUp} data-test-id="variants-list-errors-up">
            <ChevronPlainUp color={colors.error} />
          </ActionIcon>
          <ActionIcon color="gray" radius="xl" size="xs" onClick={onErrorDown} data-test-id="variants-list-errors-down">
            <ChevronPlainDown color={colors.error} />
          </ActionIcon>
        </Group>
      </Group>
    </When>
  );
};
