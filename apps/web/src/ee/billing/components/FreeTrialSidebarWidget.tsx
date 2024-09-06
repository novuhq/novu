import { Box, MantineColor, Progress, Text } from '@mantine/core';
import { colors, Button } from '@novu/design-system';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { pluralizeDaysLeft, warningLimitDays, COLOR_WARNING } from '../utils/freeTrial.constants';
import { IS_EE_AUTH_ENABLED } from '../../../config/index';
import { ROUTES } from '../../../constants/routes';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '../../../hooks';

export const FreeTrialSidebarWidget = () => {
  const { isFreeTrialActive, daysLeft, daysTotal, hasPaymentMethod } = useSubscription();
  const isImprovedBillingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_IMPROVED_BILLING_ENABLED);
  const percentRemaining = useMemo(() => {
    return daysTotal === 0 && daysLeft === 0 ? 0 : Math.round((daysLeft / daysTotal) * 100);
  }, [daysTotal, daysLeft]);

  const navigate = useNavigate();

  if (!isFreeTrialActive || hasPaymentMethod) {
    return null;
  }

  const getProgressBarColor = () => {
    if (daysLeft <= warningLimitDays(isImprovedBillingEnabled)) {
      return COLOR_WARNING;
    }
    if (daysLeft > warningLimitDays(isImprovedBillingEnabled)) {
      return colors.success;
    }
  };

  return (
    <Box mt={24} mb={24} data-test-id="free-trial-widget">
      <Text data-test-id="free-trial-widget-text" color={colors.B60} mb={8}>
        {`${pluralizeDaysLeft(daysLeft)} left on your free trial`}
      </Text>
      <Progress
        size="xs"
        data-test-id="free-trial-widget-progress"
        sections={[
          {
            value: 100 - percentRemaining,
            color: getProgressBarColor() as MantineColor,
          },
        ]}
      />
      <Button
        onClick={() => {
          navigate(IS_EE_AUTH_ENABLED ? ROUTES.MANAGE_ACCOUNT_BILLING : ROUTES.BILLING);
        }}
        data-test-id="free-trial-widget-button"
        mt={12}
        fullWidth
        size="md"
        style={{
          height: 32,
        }}
      >
        Upgrade
      </Button>
    </Box>
  );
};
