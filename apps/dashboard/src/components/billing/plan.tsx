import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsText, StripeBillingIntervalEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { ActionType } from '@/components/billing/utils/action.button.constants.ts';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { cn } from '../../utils/ui';
import { showErrorToast, showSuccessToast } from '../primitives/sonner-helpers';
import { ActivePlanBanner } from './active-plan-banner';
import { Features } from './features';
import { PlanSwitcher } from './plan-switcher';
import { type PlanConfig, PlansRow } from './plans-row';

function createPlanConfig(plan: ApiServiceLevelEnum, interval: StripeBillingIntervalEnum): PlanConfig {
  const price = getFeatureForTierAsText(
    interval === StripeBillingIntervalEnum.YEAR
      ? FeatureNameEnum.PLATFORM_ANNUAL_COST
      : FeatureNameEnum.PLATFORM_MONTHLY_COST,
    plan
  );

  const actionTypeMap = {
    [ApiServiceLevelEnum.FREE]: undefined,
    [ApiServiceLevelEnum.PRO]: ActionType.BUTTON,
    [ApiServiceLevelEnum.BUSINESS]: ActionType.BUTTON,
    [ApiServiceLevelEnum.ENTERPRISE]: ActionType.CONTACT,
    [ApiServiceLevelEnum.UNLIMITED]: ActionType.CONTACT,
  };

  return {
    name: getFeatureForTierAsText(FeatureNameEnum.PLATFORM_PLAN_LABEL, plan),
    price,
    subtitle: price === '0$' ? 'Free forever' : `billed ${interval === 'year' ? 'annually' : 'monthly'}`,
    actionType: actionTypeMap[plan],
  };
}

type DisplayedPlan =
  | ApiServiceLevelEnum.FREE
  | ApiServiceLevelEnum.PRO
  | ApiServiceLevelEnum.BUSINESS
  | ApiServiceLevelEnum.ENTERPRISE;

function getPlansConfig(interval: StripeBillingIntervalEnum): Record<DisplayedPlan, PlanConfig> {
  return {
    [ApiServiceLevelEnum.FREE]: createPlanConfig(ApiServiceLevelEnum.FREE, interval),
    [ApiServiceLevelEnum.PRO]: createPlanConfig(ApiServiceLevelEnum.PRO, interval),
    [ApiServiceLevelEnum.BUSINESS]: createPlanConfig(ApiServiceLevelEnum.BUSINESS, interval),
    [ApiServiceLevelEnum.ENTERPRISE]: createPlanConfig(ApiServiceLevelEnum.ENTERPRISE, interval),
  };
}

export function Plan() {
  const track = useTelemetry();
  const { subscription: data } = useFetchSubscription();
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<'month' | 'year'>(
    data?.billingInterval || 'month'
  );
  const plans = getPlansConfig(selectedBillingInterval as StripeBillingIntervalEnum);

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
  }, [data?.apiServiceLevel, selectedBillingInterval, track]);

  useEffect(() => {
    track(TelemetryEvent.BILLING_PAGE_VIEWED, {
      currentPlan: data?.apiServiceLevel,
      billingInterval: selectedBillingInterval,
      isTrialActive: data?.trial?.isActive,
    });
  }, [data?.apiServiceLevel, data?.trial?.isActive, selectedBillingInterval, track]);

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
        plans={plans}
        isOnTrial={data?.trial?.isActive}
      />
      <Features />
    </div>
  );
}
