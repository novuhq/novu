import { ApiServiceLevelEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
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
    mutationFn: (params: { billingInterval: 'month' | 'year'; requestedServiceLevel?: ApiServiceLevelEnum }) =>
      post<CheckoutResponse>('/billing/checkout-session', {
        body: {
          billingInterval: params.billingInterval,
          apiServiceLevel: params.requestedServiceLevel,
          isV2Dashboard: true,
        },
      }),
    onSuccess: (response, params) => {
      track(TelemetryEvent.BILLING_UPGRADE_INITIATED, {
        fromPlan: response.data.apiServiceLevel,
        toPlan: params.requestedServiceLevel,
        billingInterval: params.billingInterval,
      });
      window.location.href = response.data.stripeCheckoutUrl;
    },
    onError: (error: Error, params) => {
      track(TelemetryEvent.BILLING_UPGRADE_ERROR, {
        error: error.message,
        billingInterval: params.billingInterval,
        requestedServiceLevel: params.requestedServiceLevel,
      });
      showErrorToast(error.message || 'Unexpected error');
    },
  });

  return {
    navigateToCheckout,
    isLoading,
  };
}
