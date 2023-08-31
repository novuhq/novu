import { Group, useMantineColorScheme } from '@mantine/core';
import { colors, IExtendedCellProps, withCellLoading } from '../../../design-system';
import { Condition } from '../../../design-system/icons';
import type { ITableIntegration } from '../types';

const ConditionCellBase = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  const { colorScheme } = useMantineColorScheme();

  if (!original.conditions) {
    return (
      <div
        style={{
          color: colorScheme === 'dark' ? colors.B40 : colors.B80,
        }}
      >
        -
      </div>
    );
  }

  return (
    <Group
      style={{
        padding: '4px 8px',
        textAlign: 'center',
        borderRadius: '60px',
        background: colorScheme === 'dark' ? colors.B30 : colors.B85,
        width: '43px',
      }}
      spacing={4}
    >
      <Condition />
      <div style={{ color: colorScheme === 'dark' ? colors.B80 : colors.B40 }}>{original.conditions.length}</div>
    </Group>
  );
};

export const ConditionCell = withCellLoading(ConditionCellBase);
