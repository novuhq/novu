import React, { useEffect } from 'react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Plan } from '../components/Plan';
import { Plan as PlanV2 } from '../components/billingV2/Plan';
import { SubscriptionProvider } from '../components/SubscriptionProvider';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

export const BillingPage = () => {
  const segment = useSegment();
  const isImprovedBillingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_IMPROVED_BILLING_ENABLED);

  useEffect(() => {
    segment.track('Billing Page Viewed');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SubscriptionProvider>{isImprovedBillingEnabled ? <PlanV2 /> : <PlanV2 />}</SubscriptionProvider>;
};
