import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center';
import { IUserEntity } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import React from 'react';
import { API_ROOT, WS_URL } from '../../config';
import { useEnvController } from '../../store/use-env-controller';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvController();
  const { colorScheme } = useMantineColorScheme();

  function handlerOnUrlChange(url: string) {
    window.location.href = url;
  }

  return (
    <>
      <NovuProvider
        backendUrl={API_ROOT}
        socketUrl={WS_URL}
        subscriberId={user?._id as string}
        applicationIdentifier={environment?.identifier as string}
      >
        <PopoverNotificationCenter colorScheme={colorScheme} onUrlChange={handlerOnUrlChange}>
          {(props) => <NotificationBell {...props} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    </>
  );
}
