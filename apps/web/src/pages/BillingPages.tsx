import { IS_DOCKER_HOSTED } from '../config';

export const BillingRoutes = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('../ee/billing');
    const Routes = module.Routes;

    return <Routes />;
  } catch (e) {}

  return null;
};
