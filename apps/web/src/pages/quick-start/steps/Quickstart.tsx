import React, { useEffect } from 'react';
import { Center, Stack } from '@mantine/core';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { OnBoardingAnalyticsEnum, welcomeDescription } from '../consts';
import { Cards } from '../components/Cards';
import { BellGradient, ChatGradient, MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import { colors, Text } from '../../../design-system';
import { useSegment } from '../../../components/providers/SegmentProvider';

export function Quickstart() {
  const segment = useSegment();

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.QUICK_START_VISIT);
  }, []);

  return (
    <QuickStartWrapper title={welcomeDescription} secondaryTitle={'What would you like to build?'}>
      <Cards
        cells={[
          {
            navIcon: BellGradient,
            description: (
              <Text size="lg" weight="bold">
                Notification Center
              </Text>
            ),
            navigateTo: '/quickstart/notification-center',
          },
          {
            navIcon: OtherChannelsIcons,
            description: <OtherChannelsDescription />,
            navigateTo: '/general-started',
          },
        ]}
      />
    </QuickStartWrapper>
  );
}

export function QuickstartDescription() {
  return null;
}

export function OtherChannelsDescription() {
  return (
    <>
      <Stack align="center" style={{ gap: '3.5px' }} data-test-id={'other-channels-button'}>
        <Text size="lg" weight="bold">
          Other Channels
        </Text>
        <Text size="md" weight="normal" color={colors.B60}>
          Email, SMS, Chat Apps, Push
        </Text>
      </Stack>
    </>
  );
}

export function OtherChannelsIcons() {
  return (
    <>
      <Center inline>
        <MailGradient />
        <SmsGradient />
        <ChatGradient />
        <MobileGradient style={{ height: '26px' }} />
      </Center>
    </>
  );
}
