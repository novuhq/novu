import { UserButton } from '@clerk/clerk-react';
import { ROUTES } from '../../../constants/routes';

export function UserProfileButton() {
  return <UserButton afterSignOutUrl={ROUTES.AUTH_LOGIN} userProfileUrl={ROUTES.MANAGE_ACCOUNT_USER_PROFILE} />;
}
