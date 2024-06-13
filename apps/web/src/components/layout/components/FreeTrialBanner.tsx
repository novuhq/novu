import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { FreeTrialBanner as Component } from '../../../ee/billing';

export function FreeTrialBanner() {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Component />;
}
