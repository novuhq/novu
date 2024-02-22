import { IS_DOCKER_HOSTED } from '@novu/shared-web';

export const FreeTrialWidget = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.FreeTrialWidget;

    return <Component />;
  } catch (e) {}

  return null;
};
