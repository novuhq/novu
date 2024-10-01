import { UserButton } from '@clerk/clerk-react';
import { ROUTES } from '@/utils/routes';

export function UserProfile() {
  return <UserButton afterSignOutUrl={ROUTES.SIGN_IN} />;
}
