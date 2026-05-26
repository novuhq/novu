import { RiUserAddLine } from 'react-icons/ri';
import { IS_SELF_HOSTED } from '../../config';
import { ROUTES } from '../../utils/routes';
import { NavigationGroup } from './navigation-group';
import { NavigationLink } from './navigation-link';

// TODO: restore FreeTrialCard / UsageCard once Connect has its own billing flow.
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
