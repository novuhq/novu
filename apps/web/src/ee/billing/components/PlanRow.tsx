import { Group, useMantineTheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import React from 'react';
import { PLANS_COLUMN_WIDTH } from '../utils/plansColumnWidths';

const Column = ({ children, width }: { children: React.ReactNode; width: string }) => (
  <div
    style={{
      width,
      padding: '16px',
      textAlign: 'center',
      minHeight: '52px',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <div style={{ textAlign: 'center', width: '100%' }}>{children}</div>
  </div>
);

export interface PlanRowProps {
  label: React.ReactNode;
  heading?: boolean;
  free?: React.ReactNode | null;
  business?: React.ReactNode | null;
  enterprise?: React.ReactNode | null;
}

export const PlanRow = ({ label, heading = false, free = null, business = null, enterprise = null }: PlanRowProps) => {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';

  return (
    <Group
      spacing={0}
      style={{
        borderTop: `1px ${isDark ? colors.B30 : colors.BGLight} solid`,
      }}
      align="stretch"
    >
      <div
        style={{
          padding: '16px 24px',
          background: isDark ? colors.B20 : colors.B98,
          width: PLANS_COLUMN_WIDTH.plan,
          minHeight: '52px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text
          color={heading ? (isDark ? colors.white : colors.black) : isDark ? colors.B80 : colors.B60}
          weight={heading ? 'bold' : 'normal'}
        >
          {label}
        </Text>
      </div>
      <Column width={PLANS_COLUMN_WIDTH.free}>{free}</Column>
      <Column width={PLANS_COLUMN_WIDTH.business}>{business}</Column>
      <Column width={PLANS_COLUMN_WIDTH.enterprise}>{enterprise}</Column>
    </Group>
  );
};
