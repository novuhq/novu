import { useEffect } from 'react';
import { Stack } from '@mantine/core';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { Cards } from '../../../design-system';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { FlowTypeEnum, OnBoardingAnalyticsEnum } from '../consts';
import { ROUTES } from '../../../constants/routes.enum';

export function NotificationCenter() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FLOW_SELECTED, { flow: FlowTypeEnum.IN_APP });
  }, []);

  return (
    <QuickStartWrapper secondaryTitle={'How would you like to start?'} goBackPath={ROUTES.GET_STARTED}>
      <Cards
        cells={[
          {
            description: <InAppDescription />,
            navigateTo: '/quickstart/notification-center/set-up',
          },
          {
            description: <DemoDescription />,
            navigateTo: '/quickstart/notification-center/set-up/demo',
          },
        ]}
      />
    </QuickStartWrapper>
  );
}

export function InAppDescription() {
  return (
    <Stack align="center" spacing="xs">
      <div style={{ textAlign: 'center', lineHeight: '26px' }}>Add to existing app</div>
    </Stack>
  );
}

export function DemoDescription() {
  return (
    <Stack align="center" spacing="xs">
      <div style={{ textAlign: 'center', lineHeight: '26px' }}>Add to a demo app</div>
    </Stack>
  );
}
