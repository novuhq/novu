import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center';
import { IUserEntity, IMessage } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import React from 'react';
import { API_ROOT, WS_URL } from '../../config';
import { useEnvController } from '../../store/use-env-controller';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvController();
  const { colorScheme } = useMantineColorScheme();

  function handlerOnNotificationClick(message: IMessage) {
    if (message.cta.data.url) {
      window.location.href = message.cta.data.url;
    }
  }

  return (
    <>
      <NovuProvider
        backendUrl={API_ROOT}
        socketUrl={WS_URL}
        subscriberId={user?._id as string}
        applicationIdentifier={environment?.identifier as string}
        theme={{ colorScheme }}
      >
        <PopoverNotificationCenter onNotificationClick={handlerOnNotificationClick}>
          {(props) => <NotificationBell {...props} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    </>
  );
}
