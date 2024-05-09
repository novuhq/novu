import { selectHasUserCompletedSignUp } from '.';
import { checkShouldUseLaunchDarkly } from '..';
import { UserContext } from '../../providers/AuthProvider';

/** Determine if a fallback should be shown instead of the provider-wrapped application */
export function selectShouldShowLaunchDarklyFallback(userCtx: UserContext, isLDReady: boolean): boolean {
  const { isLoggedIn, currentOrganization } = userCtx;
  // don't show fallback if LaunchDarkly isn't enabled
  if (!checkShouldUseLaunchDarkly()) {
    return false;
  }

  // don't show fallback for unauthenticated areas of the app
  if (!isLoggedIn) {
    return false;
  }

  // don't show fallback if user is still in onboarding
  if (!selectHasUserCompletedSignUp(userCtx)) {
    return false;
  }

  // if the organization is not loaded or we haven't loaded LD, show the fallback
  return !currentOrganization || !isLDReady;
}
