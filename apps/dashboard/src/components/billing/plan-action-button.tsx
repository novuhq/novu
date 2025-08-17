import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber, PermissionsEnum } from '@novu/shared';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useBillingPortal } from '../../hooks/use-billing-portal';
import { useCheckoutSession } from '../../hooks/use-checkout-session';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { cn } from '../../utils/ui';
import { PermissionButton } from '../primitives/permission-button';
import { ContactSalesButton } from './contact-sales-button';

interface PlanActionButtonProps {
  billingInterval: 'month' | 'year';
  requestedServiceLevel: ApiServiceLevelEnum;
  className?: string;
  size?: 'sm' | 'md' | 'xs' | '2xs';
}

export function PlanActionButton({
  billingInterval,
  requestedServiceLevel,
  className,
  size = 'md',
}: PlanActionButtonProps) {
  const { subscription, isLoading: isLoadingSubscription } = useFetchSubscription();
  const { navigateToCheckout, isLoading: isCheckingOut } = useCheckoutSession();
  const { navigateToPortal, isLoading: isLoadingPortal } = useBillingPortal(billingInterval);

  // Enterprise plans show contact sales
  if (requestedServiceLevel === ApiServiceLevelEnum.ENTERPRISE) {
    return <ContactSalesButton />;
  }

  // Free tier has no button
  if (requestedServiceLevel === ApiServiceLevelEnum.FREE) {
    return null;
  }

  const isOnTrial = subscription?.trial?.isActive;
  const currentServiceLevel = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;

  // During trial, treat Pro as current level
  const effectiveCurrentLevel = isOnTrial ? ApiServiceLevelEnum.PRO : currentServiceLevel;
  const isCurrentPlan = requestedServiceLevel === effectiveCurrentLevel;

  // Current plan - show manage button
  if (isCurrentPlan && !isOnTrial) {
    return (
      <PermissionButton
        permission={PermissionsEnum.BILLING_WRITE}
        mode="outline"
        size={size}
        className={cn('gap-2', className)}
        onClick={() => navigateToPortal()}
        disabled={isLoadingPortal}
        isLoading={isLoadingSubscription}
      >
        Manage
      </PermissionButton>
    );
  }

  // Special case: Pro plan during trial should show "Upgrade plan"
  if (isOnTrial && requestedServiceLevel === ApiServiceLevelEnum.PRO) {
    return (
      <PermissionButton
        permission={PermissionsEnum.BILLING_WRITE}
        mode="gradient"
        variant="primary"
        size={size}
        className={cn('gap-2', className)}
        trailingIcon={RiArrowRightSLine}
        onClick={() => navigateToCheckout({ billingInterval, requestedServiceLevel })}
        isLoading={isCheckingOut || isLoadingSubscription}
      >
        Upgrade plan
      </PermissionButton>
    );
  }

  // Get tier indices for comparison
  const requestedIndex = getFeatureForTierAsNumber(FeatureNameEnum.TIERS_ORDER_INDEX, requestedServiceLevel);
  const currentIndex = getFeatureForTierAsNumber(FeatureNameEnum.TIERS_ORDER_INDEX, effectiveCurrentLevel);

  const isUpgrade = requestedIndex > currentIndex;

  // Don't show downgrade during trial
  if (isOnTrial && !isUpgrade) {
    return null;
  }

  const buttonLabel = isUpgrade ? 'Upgrade plan' : 'Downgrade plan';

  return (
    <PermissionButton
      permission={PermissionsEnum.BILLING_WRITE}
      mode={isUpgrade ? 'gradient' : 'lighter'}
      variant={isUpgrade ? 'primary' : 'secondary'}
      size={size}
      className={cn('gap-2', className)}
      trailingIcon={isUpgrade ? RiArrowRightSLine : undefined}
      onClick={() => navigateToCheckout({ billingInterval, requestedServiceLevel })}
      isLoading={isCheckingOut || isLoadingSubscription}
    >
      {buttonLabel}
    </PermissionButton>
  );
}
