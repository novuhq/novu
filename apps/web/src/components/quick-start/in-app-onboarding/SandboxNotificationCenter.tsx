import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { NotificationCenter, NovuProvider } from '@novu/notification-center';
import { useEnvironment } from '../../../hooks';
import { inAppSandboxSubscriberId } from '../../../pages/quick-start/consts';
import { apiHostnameManager } from '../../../utils/api-hostname-manager';

export function SandboxNotificationCenter() {
  const { environment } = useEnvironment();
  const backendUrl = apiHostnameManager.getApiHostname();
  const socketUrl = apiHostnameManager.getWebSocketHostname();

  return (
    <NovuProvider
      backendUrl={backendUrl}
      socketUrl={socketUrl}
      subscriberId={inAppSandboxSubscriberId}
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
      <NotificationCenter colorScheme={colorScheme} footer={() => <>{null}</>} showUserPreferences={false} />
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
