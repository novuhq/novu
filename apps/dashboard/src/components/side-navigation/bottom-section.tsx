import { RiUserAddLine } from 'react-icons/ri';
import { IS_SELF_HOSTED } from '../../config';
import { ROUTES } from '../../utils/routes';
import { NavigationGroup } from './navigation-group';
import { NavigationLink } from './navigation-link';

/**
 * Bottom slot of the Connect side navigation.
 *
 * Note: trial and usage cards (FreeTrialCard / UsageCard) used to render here, but they both
 * deep-link into `/settings/billing`, which Connect intentionally hides until its dedicated
 * billing flow ships. Restore them once Connect billing exists — see the Billing tab gate in
 * `settings-tabs.tsx`.
 */
export function BottomSection() {
  if (IS_SELF_HOSTED) {
    return null;
  }

  return (
    <div className="relative mt-auto gap-8 pt-4">
      <NavigationGroup>
        <NavigationLink to={ROUTES.SETTINGS_TEAM}>
          <RiUserAddLine className="size-4" />
          <span>Invite teammates</span>
        </NavigationLink>
      </NavigationGroup>
    </div>
  );
}
