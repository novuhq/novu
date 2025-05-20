import { Button } from '@/components/primitives/button';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber, PermissionsEnum } from '@novu/shared';
import { useBillingPortal } from '../../hooks/use-billing-portal';
import { useCheckoutSession } from '../../hooks/use-checkout-session';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { cn } from '../../utils/ui';
import { useHasPermission } from '@/hooks/use-has-permission';

interface PlanActionButtonProps {
  billingInterval: 'month' | 'year';
  requestedServiceLevel: ApiServiceLevelEnum;
  activeServiceLevel?: ApiServiceLevelEnum;
  mode?: 'outline' | 'filled';
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'xs' | '2xs';
}

export function PlanActionButton({
  billingInterval,
  requestedServiceLevel,
  activeServiceLevel,
  mode = 'filled',
  className,
  size = 'md',
}: PlanActionButtonProps) {
  const has = useHasPermission();
  const { subscription: data, isLoading: isLoadingSubscription } = useFetchSubscription();
  const { navigateToCheckout, isLoading: isCheckingOut } = useCheckoutSession();
  const { navigateToPortal, isLoading: isLoadingPortal } = useBillingPortal(billingInterval);

  const hasPortalAccess = has({ permission: PermissionsEnum.BILLING_PORTAL_ACCESS });
  const hasSubscriptionAccess = has({ permission: PermissionsEnum.BILLING_SUBSCRIPTION_CREATE });

  const isPaidSubscriptionActive = () => {
    return (
      data?.isActive &&
      !data?.trial?.isActive &&
      data?.apiServiceLevel !== ApiServiceLevelEnum.FREE &&
      requestedServiceLevel === data?.apiServiceLevel
    );
  };

  if (requestedServiceLevel === ApiServiceLevelEnum.FREE) {
    return null;
  }

  if (isPaidSubscriptionActive()) {
    if (!hasPortalAccess) {
      return null;
    }

    return (
      <Button
        mode="outline"
        size={size}
        className={cn('gap-2', className)}
        onClick={() => navigateToPortal()}
        disabled={isLoadingPortal}
        isLoading={isLoadingSubscription}
      >
        Manage Account
      </Button>
    );
  }

  if (!hasSubscriptionAccess) {
    return null;
  }

  const indexRequested = getFeatureForTierAsNumber(
    FeatureNameEnum.TIERS_ORDER_INDEX,
    requestedServiceLevel || ApiServiceLevelEnum.FREE
  );
  const indexActive = getFeatureForTierAsNumber(
    FeatureNameEnum.TIERS_ORDER_INDEX,
    activeServiceLevel || ApiServiceLevelEnum.FREE
  );

  const buttonLabel = indexRequested >= indexActive ? 'Upgrade plan' : 'Downgrade plan';

  return (
    <Button
      mode={mode}
      size={size}
      className={cn('gap-2', className)}
      onClick={() => navigateToCheckout({ billingInterval, requestedServiceLevel })}
      isLoading={isCheckingOut || isLoadingSubscription}
    >
      {buttonLabel}
    </Button>
  );
}
