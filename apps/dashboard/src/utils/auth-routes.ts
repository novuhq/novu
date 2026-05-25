import { ROUTES } from '@/utils/routes';

/**
 * Public Clerk auth pages (sign-in, sign-up, forgot password, etc.). The auth-provider must not
 * fire org-resolution redirects while the user is on these pages — both because the session may
 * still be settling after a satellite cookie sync and because org-list / invitation-accept have
 * their own bespoke org logic.
 */
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
