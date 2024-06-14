import React, { useState } from 'react';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import { errorMessage, Button, When } from '@novu/design-system';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useSubscription } from '../utils/hooks/useSubscription';

export const UpgradeSubmitButton = ({ intervalChanging }: { intervalChanging: boolean }) => {
  const segment = useSegment();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { isFreeTrialActive } = useSubscription();

  const handleSubmit = async (event) => {
    segment.track('Submit Payment Checkout Clicked - Billing');

    event.preventDefault();

    if (!stripe || !elements) {
      return null;
    }

    setLoading(true);
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error) {
      errorMessage(error.message || 'Unexpected error');
    }
    setLoading(false);
  };

  return (
    <Button loading={loading} disabled={intervalChanging} onClick={handleSubmit} fullWidth>
      <When truthy={!isFreeTrialActive}>Upgrade now</When>
      <When truthy={isFreeTrialActive}>Save payment method</When>
    </Button>
  );
};
