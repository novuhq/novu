import { IS_DOCKER_HOSTED } from '../config';
import { Routes } from '../ee/billing';

export const BillingRoutes = () => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Routes />;
};
