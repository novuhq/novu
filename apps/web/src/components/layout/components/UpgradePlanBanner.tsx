import { FC } from 'react';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { UpgradePlanBanner as Component } from '../../../ee/billing';

export function UpgradePlanBanner({ FeatureActivatedBanner }: { FeatureActivatedBanner: FC }) {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Component FeatureActivatedBanner={FeatureActivatedBanner} />;
}
