import { ApiServiceLevelEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { post } from '../api/api.client';
import { TelemetryEvent } from '../utils/telemetry';
import { useTelemetry } from './use-telemetry';

interface CheckoutResponse {
  data: {
    stripeCheckoutUrl: string;
    apiServiceLevel: ApiServiceLevelEnum;
  };
}

export function useCheckoutSession() {
  const track = useTelemetry();

  const { mutateAsync: navigateToCheckout, isPending: isLoading } = useMutation({
    mutationFn: (billingInterval: 'month' | 'year') =>
      post<CheckoutResponse>('/billing/checkout-session', {
        body: {
          billingInterval,
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          isV2Dashboard: true,
        },
      }),
    onSuccess: (response, billingInterval) => {
      track(TelemetryEvent.BILLING_UPGRADE_INITIATED, {
        fromPlan: response.data.apiServiceLevel,
        toPlan: ApiServiceLevelEnum.BUSINESS,
        billingInterval,
      });
      window.location.href = response.data.stripeCheckoutUrl;
    },
    onError: (error: Error, billingInterval) => {
      track(TelemetryEvent.BILLING_UPGRADE_ERROR, {
        error: error.message,
        billingInterval,
      });
      toast.error(error.message || 'Unexpected error');
    },
  });

  return {
    navigateToCheckout,
    isLoading,
  };
}
