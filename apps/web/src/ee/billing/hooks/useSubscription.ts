import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { differenceInDays, isSameDay } from 'date-fns';
import { ApiServiceLevelEnum, GetSubscriptionDto } from '@novu/shared';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../api';

const today = new Date();

export type UseSubscriptionType = GetSubscriptionDto & { trial: { daysLeft: number }; isLoading: boolean };

export const useSubscription = () => {
  const { currentOrganization } = useAuth();

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<GetSubscriptionDto>(
    ['billing-subscription', currentOrganization?._id],
    () => api.get('/v1/billing/subscription'),
    {
      enabled: !!currentOrganization,
      initialData: {
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        isActive: false,
        hasPaymentMethod: false,
        status: 'trialing',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        billingInterval: null,
        events: {
          current: 0,
          included: 0,
        },
        trial: {
          isActive: false,
          start: today.toISOString(),
          end: today.toISOString(),
          daysTotal: 0,
        },
      },
      select: (data) => {
        return {
          ...data,
          events: {
            ...data.events,
            // if included is null, customer doesn't have a valid metered subscription, default to 0
            included: data.events.included ?? 0,
          },
        };
      },
    }
  );

  const daysLeft = useMemo(() => {
    if (!subscription?.trial.end) return 0;

    return isSameDay(new Date(subscription.trial.end), today)
      ? 0
      : differenceInDays(new Date(subscription.trial.end), today);
  }, [subscription.trial.end]);

  return {
    isLoading: isLoadingSubscription,
    ...subscription,
    trial: {
      ...subscription.trial,
      daysLeft,
    },
  };
};
