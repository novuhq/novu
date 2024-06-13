import React from 'react';
import { Group } from '@mantine/core';
import { When, Text, colors } from '@novu/design-system';
import { pluralizeDaysLeft } from '../utils/freeTrial.constants';
import { PLANS_COLUMN_WIDTH } from '../utils/plansColumnWidths';
import { useSubscriptionContext } from './SubscriptionProvider';

export const FreeTrialPlanWidget = ({ isDark }: { isDark: boolean }) => {
  const { isFreeTrialActive, daysLeft } = useSubscriptionContext();

  return (
    <When truthy={isFreeTrialActive}>
      <Group data-test-id="free-trial-plan-widget" spacing={0}>
        <div style={{ width: PLANS_COLUMN_WIDTH.plan }} />
        <div style={{ width: PLANS_COLUMN_WIDTH.free }} />
        <div
          style={{
            width: PLANS_COLUMN_WIDTH.business,
            background: isDark ? 'rgba(0, 0, 0, 0.10)' : colors.B98,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <Text
            mb={8}
            style={{
              lineHeight: '20px',
            }}
            mt={8}
            size={14}
            gradient={true}
          >
            {pluralizeDaysLeft(daysLeft)} left on your trial
          </Text>
        </div>
      </Group>
    </When>
  );
};
