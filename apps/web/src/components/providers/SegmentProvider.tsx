import React, { useEffect } from 'react';
import * as mixpanel from 'mixpanel-browser';

import { SegmentService } from '../../utils/segment';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { FeatureFlagsKeysEnum } from '@novu/shared';

type Props = {
  children: React.ReactNode;
};

const SegmentContext = React.createContext<SegmentService>(undefined as any);

export const SegmentProvider = ({ children }: Props) => {
  const isV2ExperienceEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);
  const segment = React.useMemo(() => new SegmentService(), []);

  useEffect(() => {
    if (!segment._mixpanelEnabled) {
      return;
    }

    if (isV2ExperienceEnabled) {
      mixpanel.set_config({
        record_sessions_percent: 100,
      });

      return;
    }
    mixpanel.set_config({
      record_sessions_percent: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isV2ExperienceEnabled]);

  return <SegmentContext.Provider value={segment}>{children}</SegmentContext.Provider>;
};

/**
 * Note: you cannot destructure the result of this hook without risking pre-mature access of the underlying AnalyticsService.
 *
 * const segment = useSegment();
 */
export const useSegment = () => {
  const result = React.useContext(SegmentContext);
  if (!result) {
    throw new Error('Context used outside of its Provider!');
  }

  return result;
};
