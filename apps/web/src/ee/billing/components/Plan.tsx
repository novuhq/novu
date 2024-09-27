import React from 'react';
import { Center, Loader, useMantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';
import { PlanRow } from './PlanRow';
import { PlanHeader } from './PlanHeader';
import { PlanWrapper } from './PlanWrapper';
import { planList } from '../utils/planList';
import { PlanFooter } from './PlanFooter';
import { FreeTrialPlanWidget } from './FreeTrialPlanWidget';
import { useSubscriptionContext } from './SubscriptionProvider';
import { ActivePlanBanner } from './ActivePlanBanner';
import { useFeatureFlag } from '../../../hooks';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export const Plan = () => {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const { isLoading, trial } = useSubscriptionContext();
  const isImprovedBillingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_IMPROVED_BILLING_ENABLED);

  if (isLoading || trial.daysLeft === null) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <>
      {!isImprovedBillingEnabled && <FreeTrialPlanWidget isDark={isDark} />}
      {isImprovedBillingEnabled && <ActivePlanBanner />}
      <PlanWrapper isDark={isDark}>
        <PlanHeader />
        {planList.map((row, index) => (
          <PlanRow {...row} key={index} />
        ))}
      </PlanWrapper>
      <PlanFooter />
    </>
  );
};
