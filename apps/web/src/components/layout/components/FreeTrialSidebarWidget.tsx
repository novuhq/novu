import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { FreeTrialSidebarWidget as Component } from '../../../ee/billing';

export const FreeTrialSidebarWidget = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Component />;
};
