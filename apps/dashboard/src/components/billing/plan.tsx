import { useEffect, useState } from 'react';
import { ActivePlanBanner } from './active-plan-banner';
import { PlanSwitcher } from './plan-switcher';
import { PlansRow } from './plans-row';
import { HighlightsRow } from './highlights-row';
import { Features } from './features';
import { cn } from '../../utils/ui';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { ApiServiceLevelEnum, StripeBillingIntervalEnum } from '@novu/shared';
import { useFlagsMap } from '@/hooks/use-feature-flag.tsx';

export function Plan() {
  const featureFlags = useFlagsMap();
  const track = useTelemetry();
  const { subscription: data } = useFetchSubscription();
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<'month' | 'year'>(
    data?.billingInterval || 'month'
  );

  useEffect(() => {
    const checkoutResult = new URLSearchParams(window.location.search).get('result');

    if (checkoutResult === 'success') {
      showSuccessToast('Payment was successful.');
      track(TelemetryEvent.BILLING_PAYMENT_SUCCESS, {
        billingInterval: selectedBillingInterval,
        plan: data?.apiServiceLevel,
      });
    }

    if (checkoutResult === 'canceled') {
      showErrorToast('Payment was canceled.');
      track(TelemetryEvent.BILLING_PAYMENT_CANCELED, {
        billingInterval: selectedBillingInterval,
        plan: data?.apiServiceLevel,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track(TelemetryEvent.BILLING_PAGE_VIEWED, {
      currentPlan: data?.apiServiceLevel,
      billingInterval: selectedBillingInterval,
      isTrialActive: data?.trial?.isActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBillingIntervalChange = (interval: StripeBillingIntervalEnum) => {
    track(TelemetryEvent.BILLING_INTERVAL_CHANGED, {
      from: selectedBillingInterval,
      to: interval,
      currentPlan: data?.apiServiceLevel,
    });
    setSelectedBillingInterval(interval);
  };

  return (
    <div className={cn('flex w-full flex-col gap-6 p-6 pt-0')}>
      <ActivePlanBanner selectedBillingInterval={selectedBillingInterval} />
      <PlanSwitcher
        selectedBillingInterval={selectedBillingInterval}
        setSelectedBillingInterval={handleBillingIntervalChange}
      />
      <PlansRow
        selectedBillingInterval={selectedBillingInterval as StripeBillingIntervalEnum}
        currentPlan={data?.apiServiceLevel as ApiServiceLevelEnum}
        trial={data?.trial}
        featureFlags={featureFlags}
      />
      <HighlightsRow />
      <Features />
    </div>
  );
}
