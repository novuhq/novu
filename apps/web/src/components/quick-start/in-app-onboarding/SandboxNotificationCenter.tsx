import styled from '@emotion/styled';
import { Popover, useMantineColorScheme } from '@mantine/core';
import { NovuProvider, NotificationCenter } from '@novu/notification-center';
import React from 'react';
import { API_ROOT, WS_URL } from '../../../config';
import { useEnvController } from '../../../hooks';
import { onBoardingSubscriberId } from '../../../pages/quick-start/consts';
import { useAuthContext } from '../../providers/AuthProvider';

export function SandboxNotificationCenter() {
  const { environment } = useEnvController();

  return (
    <NovuProvider
      backendUrl={API_ROOT}
      socketUrl={WS_URL}
      subscriberId={onBoardingSubscriberId}
      applicationIdentifier={environment?.identifier as string}
    >
      <PopoverWrapper />
    </NovuProvider>
  );
}

function PopoverWrapper() {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Wrapper>
      <NotificationCenter colorScheme={colorScheme} footer={() => <>{null}</>} />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;

  & > div {
    max-height: 316px;
    overflow: hidden;
    border-radius: 7px;
    width: 320px;
    max-width: 320px;
  }

  & .infinite-scroll-component {
    // !important is needed to override the inline style
    height: 245px !important;
  }
`;
