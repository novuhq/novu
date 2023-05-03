import { useMantineColorScheme } from '@mantine/core';
import { IUserEntity, IMessage, MessageActionStatusEnum, ButtonTypeEnum } from '@novu/shared';
import { NotificationBell, NovuProvider, PopoverNotificationCenter, useUpdateAction } from '@novu/notification-center';

import { API_ROOT, WS_URL } from '../../../config';
import { useEnvController } from '../../../hooks';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvController();

  return (
    <>
      <NovuProvider
        backendUrl={API_ROOT}
        socketUrl={WS_URL}
        subscriberId={user?._id as string}
        applicationIdentifier={environment?.identifier as string}
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
