import { FreeTrialBanner as Component } from '../../../ee/billing';
import { IS_SELF_HOSTED } from '../../../config';

export function FreeTrialBanner() {
  if (IS_SELF_HOSTED) {
    return null;
  }

  return <Component />;
}
