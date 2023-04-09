import { Group, Stack } from '@mantine/core';
import { colors, Tooltip } from '../../../design-system';
import { InfoCircle } from '../../../design-system/icons/general/InfoCircle';
import { useMantineTheme } from '@mantine/core';

export const LabelWithTooltip = ({ label, tooltip }) => {
  const theme = useMantineTheme();

  return (
    <Group spacing={8}>
      <div
        style={{
          color: theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[8],
          fontWeight: 700,
          fontSize: '14px',
          lineHeight: '17px',
          margin: '5px 0px',
        }}
      >
        {label}
      </div>
      <Tooltip label={tooltip}>
        <Stack
          sx={{
            height: '100%',
            zIndex: 99999,
          }}
        >
          <InfoCircle color={colors.B60} />
        </Stack>
      </Tooltip>
    </Group>
  );
};
