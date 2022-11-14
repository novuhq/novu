import { IUserEntity, IMessage, MessageActionStatusEnum, ButtonTypeEnum } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import React from 'react';
import { API_ROOT, WS_URL } from '../../config';
import { useEnvController } from '../../store/use-env-controller';
import { NotificationBell, NovuProvider, PopoverNotificationCenter, useNotifications } from '@novu/notification-center';

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
  const { updateAction, markAsSeen } = useNotifications();

  function handlerOnNotificationClick(message: IMessage) {
    if (message?.cta?.data?.url) {
      markAsSeen();
      window.location.href = message.cta.data.url;
    }
  }

  async function handlerOnActionClick(templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) {
    await updateAction(message._id, type, MessageActionStatusEnum.DONE);
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
