import React from 'react';
import { colors, Text } from '@novu/design-system';
import { Group, useMantineTheme } from '@mantine/core';

export const ContactSalesButton = ({ onContactSales, label }: { onContactSales: () => void; label?: string }) => {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const salesLabel = label || 'Contact sales';

  return (
    <Group position="center" spacing={4}>
      <Text color={isDark ? colors.B60 : colors.B40}>Questions?</Text>
      <Text gradient>
        <a
          onClick={onContactSales}
          style={{
            cursor: 'pointer',
          }}
        >
          {salesLabel}
        </a>
      </Text>
    </Group>
  );
};
