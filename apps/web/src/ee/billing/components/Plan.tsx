import React from 'react';
import { Center, Loader, useMantineTheme } from '@mantine/core';
import { PlanRow } from './PlanRow';
import { PlanHeader } from './PlanHeader';
import { PlanWrapper } from './PlanWrapper';
import { planList } from '../utils/planList';
import { PlanFooter } from './PlanFooter';
import { FreeTrialPlanWidget } from './FreeTrialPlanWidget';
import { useSubscriptionContext } from './SubscriptionProvider';
import { colors } from '@novu/design-system';

export const Plan = () => {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const { isLoading, daysLeft } = useSubscriptionContext();

  if (isLoading || daysLeft === null) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <>
      <FreeTrialPlanWidget isDark={isDark} />
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
