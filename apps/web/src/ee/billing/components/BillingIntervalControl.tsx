import { Box, SegmentedControl, useMantineTheme } from '@mantine/core';
import { colors, getGradient, shadows } from '@novu/design-system';
import React from 'react';

export const BillingIntervalControl = ({
  onChange,
  value,
}: {
  onChange: (value: 'month' | 'year') => void;
  value: 'month' | 'year';
}) => {
  const { colorScheme, ...theme } = useMantineTheme();
  const isDark = colorScheme === 'dark';

  return (
    <SegmentedControl
      data-test-id="billing-interval-control"
      value={value}
      data={[
        {
          label: <Box data-test-id="billing-interval-control-monthly">Monthly</Box>,
          value: 'month',
        },
        {
          label: (
            <Box data-test-id="billing-interval-control-annually">
              Annually<span style={{ marginLeft: 4, color: colors.success }}>10% off</span>
            </Box>
          ),
          value: 'year',
        },
      ]}
      onChange={(changeValue) => onChange(changeValue as 'month' | 'year')}
      radius="xl"
      styles={{
        root: {
          width: '100%',
          background: isDark ? theme.colors.dark[7] : theme.white,
          padding: '5px',
          boxShadow: isDark ? shadows.dark : shadows.light,
        },
        active: {
          background: `${isDark ? getGradient(colors.B20) : getGradient(colors.white)} padding-box, ${
            colors.horizontal
          } border-box`,
          border: '2px solid transparent',
        },
        label: {
          fontSize: '14px',
          fontWeight: 700,
          padding: `10px 8px`,
          color: theme.colors.gray[8],
        },
        labelActive: {
          color: isDark ? theme.white : theme.colors.gray[8],
        },
      }}
    />
  );
};
