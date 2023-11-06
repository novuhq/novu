import { Group, Stack } from '@mantine/core';
import { useEffect } from 'react';

import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes.enum';
import { Cards } from '@novu/design-system';
import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { frameworkSetupTitle, OnBoardingAnalyticsEnum } from '../consts';

export function FrameworkSetup() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FRAMEWORKS_SETUP_VISIT);
  }, [segment]);

  return (
    <QuickStartWrapper title={frameworkSetupTitle} goBackPath={ROUTES.QUICK_START_NOTIFICATION_CENTER}>
      <Stack>
        <Cards
          cells={[
            {
              imagePath: `/static/images/frameworks/react.png`,
              navigateTo: '/quickstart/notification-center/set-up/react',
            },
            {
              imagePath: `/static/images/frameworks/angular.png`,
              navigateTo: '/quickstart/notification-center/set-up/angular',
            },
            {
              imagePath: `/static/images/frameworks/vue.png`,
              navigateTo: '/quickstart/notification-center/set-up/vue',
            },
          ]}
        />
        <Group position="center">
          <Cards
            cells={[
              {
                imagePath: `/static/images/frameworks/js.png`,
                navigateTo: '/quickstart/notification-center/set-up/js',
              },
            ]}
          />
        </Group>
      </Stack>
    </QuickStartWrapper>
  );
}
