import { Button } from '@/components/primitives/button';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useBillingPortal } from '../../hooks/use-billing-portal';
import { useCheckoutSession } from '../../hooks/use-checkout-session';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { cn } from '../../utils/ui';

interface PlanActionButtonProps {
  selectedBillingInterval: 'month' | 'year';
  mode?: 'outline' | 'filled';
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'xs' | '2xs';
}

export function PlanActionButton({
  selectedBillingInterval,
  mode = 'filled',
  className,
  size = 'md',
}: PlanActionButtonProps) {
  const { subscription: data, isLoading: isLoadingSubscription } = useFetchSubscription();
  const { navigateToCheckout, isLoading: isCheckingOut } = useCheckoutSession();
  const { navigateToPortal, isLoading: isLoadingPortal } = useBillingPortal(selectedBillingInterval);

  const isPaidSubscriptionActive = () => {
    return data?.isActive && !data?.trial?.isActive && data?.apiServiceLevel !== ApiServiceLevelEnum.FREE;
  };

  const handleAction = () => {
    if (isPaidSubscriptionActive()) {
      navigateToPortal();
    } else {
      navigateToCheckout(selectedBillingInterval);
    }
  };

  return (
    <Button
      mode={mode}
      size={size}
      className={cn('gap-2', className)}
      onClick={handleAction}
      disabled={isLoadingPortal}
      isLoading={isCheckingOut || isLoadingSubscription}
    >
      {isPaidSubscriptionActive() ? 'Manage Account' : 'Upgrade plan'}
    </Button>
  );
}
