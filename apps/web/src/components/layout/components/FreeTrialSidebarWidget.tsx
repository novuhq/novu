import { FreeTrialSidebarWidget as Component } from '../../../ee/billing';
import { IS_SELF_HOSTED, IS_EE_AUTH_ENABLED } from '../../../config';

export const FreeTrialSidebarWidget = () => {
  if (IS_SELF_HOSTED) {
    return null;
  }

  return <Component />;
};
