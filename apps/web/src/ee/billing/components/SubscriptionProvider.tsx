import React, { useContext } from 'react';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useSubscription, UseSubscriptionType } from '../hooks/useSubscription';

export type { UseSubscriptionType } from '../hooks/useSubscription';

const SubscriptionContext = React.createContext<UseSubscriptionType>({
  isLoading: false,
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
    start: new Date().toISOString(),
    end: new Date().toISOString(),
    daysTotal: 0,
    daysLeft: 0,
  },
  cancelAt: null,
});

export const useSubscriptionContext = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const props = useSubscription();

  return <SubscriptionContext.Provider value={{ ...props }}>{children}</SubscriptionContext.Provider>;
};
