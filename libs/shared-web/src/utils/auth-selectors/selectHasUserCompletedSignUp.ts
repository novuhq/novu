import { UserContext } from '../../providers';

/**
 * Determine if a user is fully-registered; if not, they're still in onboarding.
 */
export const selectHasUserCompletedSignUp = (userCtx: UserContext): boolean => {
  if (!userCtx) {
    return false;
  }

  // User has completed registration if they have an associated orgId.
  return !!userCtx.jwtPayload?.organizationId;
};
