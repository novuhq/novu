import React, { useContext } from 'react';
import { useSubscription } from '../utils/hooks/useSubscription';

const SubscriptionContext = React.createContext<{
  daysTotal: number;
  daysLeft: number;
  isLoading: boolean;
  isFreeTrialActive: boolean;
  hasPaymentMethod: boolean;
}>({
  daysTotal: 0,
  daysLeft: 0,
  isLoading: false,
  isFreeTrialActive: false,
  hasPaymentMethod: false,
});

export const useSubscriptionContext = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const props = useSubscription();

  return <SubscriptionContext.Provider value={{ ...props }}>{children}</SubscriptionContext.Provider>;
};
