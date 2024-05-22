import { UserContext } from '@novu/shared-web';
import { checkShouldUseLaunchDarkly } from '@novu/shared-web';

/** Determine if LaunchDarkly should be initialized based on the current auth context */
export function selectShouldInitializeLaunchDarkly(userCtx: UserContext): boolean {
  const { isLoggedIn, currentUser, currentOrganization } = userCtx;
  // don't show fallback if LaunchDarkly isn't enabled
  if (!checkShouldUseLaunchDarkly()) {
    return false;
  }

  // enable feature flags for unauthenticated areas of the app
  if (!isLoggedIn) {
    return true;
  }

  /**
   * Allow LD to load when the user is created but still in onboarding.
   *
   * After users provide their name, email, and password, we take them to an onboarding step where they provide details
   * such as job title, use cases, company name, etc. When they reach this page, isLoggedIn is true, but they don't
   * have an organizationId yet that we can use for org-based feature flags. To prevent from blocking this page
   * from loading during this "limbo" state, we should initialize LD with the anonymous context.
   */
  if (!currentUser?.organizationId) {
    return true;
  }

  // if a user is fully on-boarded, but no organization has loaded, we must wait for the organization to initialize the client.
  return !!currentOrganization;
}
