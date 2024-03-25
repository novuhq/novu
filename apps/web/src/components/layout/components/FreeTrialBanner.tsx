import { IS_DOCKER_HOSTED } from '@novu/shared-web';

export function FreeTrialBanner() {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.FreeTrialBanner;

    return <Component />;
  } catch (e) {}

  return null;
}
