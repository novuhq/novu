import React, { useContext } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { ApiServiceLevelEnum } from '@novu/shared';

const SubscriptionContext = React.createContext<{
  daysTotal: number;
  daysLeft: number;
  isLoading: boolean;
  isFreeTrialActive: boolean;
  hasPaymentMethod: boolean;
  status: string | null;
  trialStart: Date;
  trialEnd: Date;
  apiServiceLevel: ApiServiceLevelEnum;
  currentEvents: number;
  maxEvents: number;
}>({
  daysTotal: 0,
  daysLeft: 0,
  isLoading: false,
  isFreeTrialActive: false,
  hasPaymentMethod: false,
  status: null,
  trialStart: new Date(),
  trialEnd: new Date(),
  apiServiceLevel: ApiServiceLevelEnum.FREE,
  currentEvents: 0,
  maxEvents: 0,
});

export const useSubscriptionContext = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const props = useSubscription();

  return <SubscriptionContext.Provider value={{ ...props }}>{children}</SubscriptionContext.Provider>;
};
