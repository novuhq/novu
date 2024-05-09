import { selectHasUserCompletedSignUp } from './selectHasUserCompletedSignUp';
import { checkShouldUseLaunchDarkly } from '../checkShouldUseLaunchDarkly';
import { UserContext } from '../../providers/AuthProvider';

/** Determine if LaunchDarkly should be initialized based on the current auth context */
export function selectShouldInitializeLaunchDarkly(userCtx: UserContext): boolean {
  const { isLoggedIn, currentOrganization } = userCtx;
  // don't show fallback if LaunchDarkly isn't enabled
  if (!checkShouldUseLaunchDarkly()) {
    return false;
  }

  // enable feature flags for unauthenticated areas of the app
  if (!isLoggedIn) {
    return true;
  }

  // allow LD to load when the user is created but still in onboarding
  if (!selectHasUserCompletedSignUp(userCtx)) {
    return true;
  }

  // if a user is fully on-boarded, but no organization has loaded, we must wait for the organization to initialize the client.
  return !!currentOrganization;
}
