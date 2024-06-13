import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { FC } from 'react';

export function UpgradePlanBanner({ FeatureActivatedBanner }: { FeatureActivatedBanner: FC }) {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.UpgradePlanBanner;

    return <Component FeatureActivatedBanner={FeatureActivatedBanner} />;
  } catch (e) {}

  return null;
}
