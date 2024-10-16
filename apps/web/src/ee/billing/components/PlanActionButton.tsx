import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { errorMessage, When } from '@novu/design-system';
import { api } from '../../../api';
import { useSubscriptionContext } from './SubscriptionProvider';
import { useSegment } from '../../../components/providers/SegmentProvider';

const checkoutUrl = '/v1/billing/checkout-session';
const billingPortalUrl = '/v1/billing/portal';

export const PlanActionButton = ({ selectedBillingInterval }: { selectedBillingInterval: 'month' | 'year' }) => {
  const segment = useSegment();
  const { isActive, trial, apiServiceLevel } = useSubscriptionContext();
  const isPaidSubscriptionActive = isActive && !trial.isActive && apiServiceLevel !== ApiServiceLevelEnum.FREE;

  const { mutateAsync: checkout, isLoading: isCheckingOut } = useMutation<{ stripeCheckoutUrl: string }, Error>(
    () =>
      api.post(checkoutUrl, {
        billingInterval: selectedBillingInterval,
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      }),
    {
      onSuccess: (data) => {
        window.location.href = data.stripeCheckoutUrl;
      },
      onError: (e: Error) => {
        errorMessage(e.message || 'Unexpected error');
      },
    }
  );

  const { mutateAsync: goToPortal, isLoading: isGoingToPortal } = useMutation<string, Error>(
    () => api.get(billingPortalUrl),
    {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: (e: Error) => {
        errorMessage(e.message || 'Unexpected error');
      },
    }
  );

  return (
    <>
      <When truthy={isPaidSubscriptionActive}>
        <Button
          className={styles.planActionButton}
          loading={isGoingToPortal}
          data-test-id={`plan-${apiServiceLevel}-manage`}
          onClick={() => {
            segment.track(`Manage Subscription Clicked - Plans List`);
            goToPortal();
          }}
        >
          Manage subscription
        </Button>
      </When>
      <When truthy={!isPaidSubscriptionActive}>
        <Button
          className={styles.planActionButton}
          loading={isCheckingOut}
          data-test-id="plan-business-upgrade"
          onClick={() => checkout()}
        >
          Upgrade plan
        </Button>
      </When>
    </>
  );
};

const styles = {
  planActionButton: css({
    background: '#2A92E7 !important',
    fontWeight: '400 !important',
  }),
};
