import { useMantineColorScheme } from '@mantine/core';
import {
  ColorScheme,
  NotificationBell as NovuNotificationBell,
  NovuProvider,
  PopoverNotificationCenter,
  useUpdateAction,
} from '@novu/notification-center';
import { ButtonTypeEnum, FeatureFlagsKeysEnum, IMessage, IUserEntity, MessageActionStatusEnum } from '@novu/shared';

import styled from '@emotion/styled';
import { colors, IconNotifications } from '@novu/design-system';
import { API_ROOT, APP_ID, IS_EU_ENV, WS_URL } from '../../../config';
import { useEnvController, useFeatureFlag } from '../../../hooks';

const BACKEND_URL = IS_EU_ENV ? 'https://api.novu.co' : API_ROOT;
const SOCKET_URL = IS_EU_ENV ? 'https://ws.novu.co' : WS_URL;

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvController();

  return (
    <>
      <NovuProvider
        backendUrl={BACKEND_URL}
        socketUrl={SOCKET_URL}
        subscriberId={user?._id as string}
        applicationIdentifier={APP_ID || (environment?.identifier as string)}
      >
        <PopoverWrapper />
      </NovuProvider>
    </>
  );
}

function PopoverWrapper() {
  const { colorScheme } = useMantineColorScheme();
  const { updateAction } = useUpdateAction();

  function handlerOnNotificationClick(message: IMessage) {
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  async function handlerOnActionClick(templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) {
    await updateAction({ messageId: message._id, actionButtonType: type, status: MessageActionStatusEnum.DONE });
  }

  return (
    <PopoverNotificationCenter
      colorScheme={colorScheme}
      onNotificationClick={handlerOnNotificationClick}
      onActionClick={handlerOnActionClick}
    >
      {({ unseenCount }) => {
        return <NotificationBell colorScheme={colorScheme} unseenCount={unseenCount} />;
      }}
    </PopoverNotificationCenter>
  );
}

function NotificationBell({ unseenCount, colorScheme }: { unseenCount?: number; colorScheme: ColorScheme }) {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  if (!isInformationArchitectureEnabled) {
    return <NovuNotificationBell unseenCount={unseenCount} colorScheme={colorScheme} />;
  }

  return (
    <span style={{ position: 'relative' }}>
      <IconNotifications color={colors.B60} />
      {!!unseenCount && <StyledDot />}
    </span>
  );
}

const StyledDot = styled.div`
  position: absolute;
  top: -35%;
  right: -5%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${colors.vertical};
  border: 2px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
`;
