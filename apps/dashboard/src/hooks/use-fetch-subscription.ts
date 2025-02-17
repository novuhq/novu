import { getSubscription } from '@/api/billing';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import type { GetSubscriptionDto } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, isSameDay } from 'date-fns';
import { useMemo } from 'react';

const today = new Date();

export type UseSubscriptionType = GetSubscriptionDto & { daysLeft: number; isLoading: boolean };

export const useFetchSubscription = () => {
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<GetSubscriptionDto>({
    queryKey: [QueryKeys.billingSubscription, currentOrganization?._id],
    queryFn: () => getSubscription({ environment: currentEnvironment! }),
    enabled: !!currentOrganization,
    meta: {
      showError: false,
    },
  });

  const daysLeft = useMemo(() => {
    if (!subscription?.trial.end) return 0;

    return isSameDay(new Date(subscription.trial.end), today)
      ? 0
      : differenceInDays(new Date(subscription.trial.end), today);
  }, [subscription?.trial.end]);

  return {
    isLoading: isLoadingSubscription,
    subscription,
    daysLeft,
  };
};
