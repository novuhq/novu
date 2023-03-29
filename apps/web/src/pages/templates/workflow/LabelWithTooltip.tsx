import { Group, Stack } from '@mantine/core';
import { colors, Tooltip } from '../../../design-system';
import { InfoCircle } from '../../../design-system/icons/general/InfoCircle';

export const LabelWithTooltip = ({ label, tooltip }) => {
  return (
    <Group spacing={8}>
      <span>{label}</span>
      <Tooltip label={tooltip}>
        <Stack
          sx={{
            height: '100%',
          }}
        >
          <InfoCircle color={colors.B60} />
        </Stack>
      </Tooltip>
    </Group>
  );
};
