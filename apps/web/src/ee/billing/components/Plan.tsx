import { Center, Loader, useMantineTheme } from '@mantine/core';
import { colors, errorMessage, successMessage } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { PlanSwitcher } from './PlanSwitcher';
import { useSubscriptionContext } from './SubscriptionProvider';
import { ActivePlanBanner } from './ActivePlanBanner';
import { PlansRow } from './PlansRow';
import { HighlightsRow } from './HighlightsRow';
import { Features } from './Features';

export const Plan = () => {
  const theme = useMantineTheme();
  const { isLoading, billingInterval: subscriptionBillingInterval } = useSubscriptionContext();
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<'month' | 'year'>(
    subscriptionBillingInterval || 'month'
  );

  useEffect(() => {
    const checkoutResult = new URLSearchParams(window.location.search).get('result');

    if (checkoutResult === 'success') {
      successMessage('Payment was successful.');
    }

    if (checkoutResult === 'canceled') {
      errorMessage('Order canceled.');
    }
  }, []);

  if (isLoading) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <>
      <ActivePlanBanner selectedBillingInterval={selectedBillingInterval} />
      <PlanSwitcher
        theme={theme}
        selectedBillingInterval={selectedBillingInterval}
        setSelectedBillingInterval={setSelectedBillingInterval}
      />
      <PlansRow theme={theme} selectedBillingInterval={selectedBillingInterval} />
      <HighlightsRow />
      <Features />
    </>
  );
};
