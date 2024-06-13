import { api } from '../../../../api';
import { useAuth } from '../../../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { differenceInDays, isSameDay } from 'date-fns';
import { ApiServiceLevelEnum } from '@novu/shared';

export const useSubscription = () => {
  // TODO: Fix with a useMemo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = new Date();
  const { currentOrganization } = useAuth();
  const { data, isLoading } = useQuery(
    ['billing-subscription', currentOrganization?._id],
    () => api.get('/v1/billing/subscription'),
    {
      initialData: {
        trialStart: today.toISOString(),
        trialEnd: today.toISOString(),
        hasPaymentMethod: false,
        status: null,
      },
    }
  );

  const daysTotal = useMemo(() => {
    return data.trialStart && data.trialEnd ? differenceInDays(new Date(data.trialEnd), new Date(data.trialStart)) : 0;
  }, [data.trialStart, data.trialEnd]);
  const daysLeft = useMemo(() => {
    return isSameDay(new Date(data.trialEnd), today) ? 0 : differenceInDays(new Date(data.trialEnd), today);
  }, [data.trialEnd, today]);

  const isFreeTrialActive = !isLoading && data.status === 'trialing';

  return {
    daysTotal,
    daysLeft,
    isLoading,
    isFreeTrialActive,
    hasPaymentMethod: data.hasPaymentMethod,
    trialStart: data.trialStart,
    trialEnd: data.trialEnd,
    apiServiceLevel: currentOrganization?.apiServiceLevel || ApiServiceLevelEnum.FREE,
  };
};
