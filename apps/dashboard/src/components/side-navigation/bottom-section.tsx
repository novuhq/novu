import { ApiServiceLevelEnum } from '@novu/shared';
import { RiUserAddLine } from 'react-icons/ri';
import { IS_SELF_HOSTED } from '../../config';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { ROUTES } from '../../utils/routes';
import { FreeTrialCard } from './free-trial-card';
import { NavigationGroup } from './navigation-group';
import { NavigationLink } from './navigation-link';
import { UsageCard } from './usage-card';

export function BottomSection() {
  const { subscription, daysLeft, isLoading: isLoadingSubscription } = useFetchSubscription();
  const isTrialActive = subscription?.trial.isActive;
  const isFreeTier = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;

  if (IS_SELF_HOSTED) {
    return null;
  }

  return (
    <div className="relative mt-auto gap-8 pt-4">
      {isTrialActive && !isLoadingSubscription && daysLeft !== undefined && (
        <FreeTrialCard subscription={subscription} daysLeft={daysLeft} />
      )}

      {!isTrialActive && isFreeTier && !isLoadingSubscription && <UsageCard subscription={subscription} />}
      <NavigationGroup>
        <NavigationLink to={ROUTES.SETTINGS_TEAM}>
          <RiUserAddLine className="size-4" />
          <span>Invite teammates</span>
        </NavigationLink>
      </NavigationGroup>
    </div>
  );
}
