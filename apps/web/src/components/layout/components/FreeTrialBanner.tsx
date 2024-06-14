import { FreeTrialBanner as Component } from '../../../ee/billing';
import { IS_DOCKER_HOSTED } from '../../../config';

export function FreeTrialBanner() {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Component />;
}
