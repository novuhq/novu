import { useMantineColorScheme } from '@mantine/core';
import { NovuProvider, PopoverNotificationCenter, useUpdateAction } from '@novu/notification-center';
import { ButtonTypeEnum, IMessage, IUserEntity, MessageActionStatusEnum } from '@novu/shared';

import { API_ROOT, APP_ID, IS_EU_ENV, WS_URL } from '../../../config';
import { useEnvController } from '../../../hooks';
import { NotificationCenterBell } from './NotificationCenterBell';

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
        return <NotificationCenterBell colorScheme={colorScheme} unseenCount={unseenCount} />;
      }}
    </PopoverNotificationCenter>
  );
}
