import { IS_SELF_HOSTED } from '../config';
import { Routes } from '../ee/billing';

export const BillingRoutes = () => {
  if (IS_SELF_HOSTED) {
    return null;
  }

  return <Routes />;
};
