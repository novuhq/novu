import { IS_DOCKER_HOSTED } from '@novu/shared-web';

export const FreeTrialSidebarWidget = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.FreeTrialSidebarWidget;

    return <Component />;
  } catch (e) {}

  return null;
};
