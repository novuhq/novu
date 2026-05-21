import { ROUTES } from '@/utils/routes';

/**
 * Clerk sign-in/sign-up/forgot flows on the Connect satellite host. These must not trigger
 * auth-provider org redirects while the primary→satellite handshake is still completing.
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
