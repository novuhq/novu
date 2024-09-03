import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { differenceInDays, isSameDay } from 'date-fns';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../api';

const today = new Date();

export const useSubscription = () => {
  const { currentOrganization } = useAuth();
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery(
    ['billing-subscription', currentOrganization?._id],
    () => api.get('/v1/billing/subscription'),
    {
      enabled: !!currentOrganization,
      initialData: {
        trialStart: today.toISOString(),
        trialEnd: today.toISOString(),
        hasPaymentMethod: false,
        status: null,
      },
    }
  );

  const { data: plan, isLoading: isLoadingPlan } = useQuery(
    ['plan', currentOrganization?._id],
    () => api.get('/v1/billing/plan'),
    {
      enabled: !!currentOrganization,
    }
  );

  // TODO: Move these calculations to server side
  const daysTotal = useMemo(() => {
    return subscription.trialStart && subscription.trialEnd
      ? differenceInDays(new Date(subscription.trialEnd), new Date(subscription.trialStart))
      : 0;
  }, [subscription.trialStart, subscription.trialEnd]);
  const daysLeft = useMemo(() => {
    return isSameDay(new Date(subscription.trialEnd), today)
      ? 0
      : differenceInDays(new Date(subscription.trialEnd), today);
  }, [subscription.trialEnd]);

  const isFreeTrialActive = subscription.status === 'trialing';

  return {
    daysTotal,
    daysLeft,
    isFreeTrialActive,
    isLoading: isLoadingSubscription || isLoadingPlan,
    hasPaymentMethod: subscription.hasPaymentMethod,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
    apiServiceLevel: plan?.apiServiceLevel,
  };
};
