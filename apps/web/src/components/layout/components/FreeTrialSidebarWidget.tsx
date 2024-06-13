import { FreeTrialSidebarWidget as Component } from '../../../ee/billing';
import { IS_DOCKER_HOSTED } from '../../../config';

export const FreeTrialSidebarWidget = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Component />;
};
