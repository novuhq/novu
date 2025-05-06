import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { get } from '../api/api.client';
import { TelemetryEvent } from '../utils/telemetry';
import { useTelemetry } from './use-telemetry';

export function useBillingPortal(billingInterval?: 'month' | 'year') {
  const track = useTelemetry();

  const { mutateAsync: navigateToPortal, isPending: isLoading } = useMutation({
    mutationFn: () => get<{ data: string }>('/billing/portal?isV2Dashboard=true'),
    onSuccess: (response) => {
      track(TelemetryEvent.BILLING_PORTAL_ACCESSED, {
        billingInterval,
      });
      window.location.href = response?.data;
    },
    onError: (error: Error) => {
      track(TelemetryEvent.BILLING_PORTAL_ERROR, {
        error: error.message,
      });
      toast.error(error.message || 'Unexpected error');
    },
  });

  return {
    navigateToPortal,
    isLoading,
  };
}
