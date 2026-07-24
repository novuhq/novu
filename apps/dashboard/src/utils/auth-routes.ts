import { ROUTES } from '@/utils/routes';

// Public Clerk auth pages. Excludes org-list and invitation-accept which run their own org logic.
export function isPublicAuthPath(pathname: string): boolean {
  if (!pathname.startsWith('/auth/')) {
    return false;
  }

  if (pathname === ROUTES.SIGNUP_ORGANIZATION_LIST) {
    return false;
  }

  if (pathname.startsWith(ROUTES.INVITATION_ACCEPT)) {
    return false;
  }

  return true;
}
