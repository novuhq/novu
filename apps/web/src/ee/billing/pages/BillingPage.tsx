import React, { useEffect } from 'react';
import { Plan } from '../components/Plan';
import { SubscriptionProvider } from '../components/SubscriptionProvider';
import { useSegment } from '../../../components/providers/SegmentProvider';

export const BillingPage = () => {
  const segment = useSegment();

  useEffect(() => {
    segment.track('Billing Page Viewed');
  }, []);

  return (
    <SubscriptionProvider>
      <Plan />
    </SubscriptionProvider>
  );
};
