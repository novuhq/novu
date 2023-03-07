import React, { useEffect } from 'react';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { Cards } from '../components/Cards';
import { Stack } from '@mantine/core';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { FlowTypeEnum, OnBoardingAnalyticsEnum } from '../consts';

export function NotificationCenter() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FLOW_SELECTED, { flow: FlowTypeEnum.IN_APP });
  }, []);

  return (
    <QuickStartWrapper secondaryTitle={'How would you like to start?'}>
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
