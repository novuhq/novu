import { FC } from 'react';
import { IS_SELF_HOSTED } from '../../../config';
import { UpgradePlanBanner as Component } from '../../../ee/billing';

export function UpgradePlanBanner({ FeatureActivatedBanner }: { FeatureActivatedBanner: FC }) {
  if (IS_SELF_HOSTED) {
    return null;
  }

  return <Component FeatureActivatedBanner={FeatureActivatedBanner} />;
}
