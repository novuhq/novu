import { useEffect } from 'react';
import { Stack } from '@mantine/core';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { OnBoardingAnalyticsEnum, welcomeDescription } from '../consts';
import { Cards } from '../../../design-system';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes.enum';

export function FrameworkSetup() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FRAMEWORKS_SETUP_VISIT);
  }, []);

  return (
    <QuickStartWrapper
      title={welcomeDescription}
      secondaryTitle={<ImplementationDescription />}
      faq={true}
      goBackPath={ROUTES.QUICK_START_NOTIFICATION_CENTER}
    >
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
          {
            imagePath: `/static/images/frameworks/js.png`,
            navigateTo: '/quickstart/notification-center/set-up/js',
          },
        ]}
      />
    </QuickStartWrapper>
  );
}

export function ImplementationDescription() {
  return (
    <Stack align="center" sx={{ gap: '20px' }}>
      <span>A fully functional notification center is now at your fingertips.</span>
      <span>What's your go-to frontend framework?</span>
    </Stack>
  );
}
