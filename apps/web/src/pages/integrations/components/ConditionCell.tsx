import { Group, useMantineColorScheme } from '@mantine/core';
import { colors, IExtendedCellProps, withCellLoading, Condition } from '@novu/design-system';
import type { ITableIntegration } from '../types';

const ConditionCellBase = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  const { colorScheme } = useMantineColorScheme();

  if (!original.conditions || original.conditions.length < 1) {
    return (
      <div
        data-test-id="integration-conditions-cell"
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
      data-test-id="integration-conditions-cell"
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
      <div style={{ color: colorScheme === 'dark' ? colors.B80 : colors.B40 }}>
        {original.conditions?.[0]?.children?.length}
      </div>
    </Group>
  );
};

export const ConditionCell = withCellLoading(ConditionCellBase);
