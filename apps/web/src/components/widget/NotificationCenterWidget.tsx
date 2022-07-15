import { IUserEntity, IMessage } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import React from 'react';
import { API_ROOT, WS_URL } from '../../config';
import { useEnvController } from '../../store/use-env-controller';
import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/notification-center';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvController();
  const { colorScheme } = useMantineColorScheme();

  function handlerOnNotificationClick(message: IMessage) {
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  console.log(user?._id);

  return (
    <>
      <NovuProvider
        backendUrl={API_ROOT}
        socketUrl={WS_URL}
        subscriberId={user?._id as string}
        applicationIdentifier={environment?.identifier as string}
      >
        <PopoverNotificationCenter
          tabs={[
            {
              name: 'test',
              query: {
                feedId: '62cfd6d38516f4fcbb3a3517',
              },
            },
            {
              name: 'test2',
              query: {
                feedId: '62cffb818516f4fcbb3a351a',
              },
            },
          ]}
          colorScheme={colorScheme}
          onNotificationClick={handlerOnNotificationClick}
        >
          {({ unseenCount }) => {
            return <NotificationBell colorScheme={colorScheme} unseenCount={unseenCount} />;
          }}
        </PopoverNotificationCenter>
      </NovuProvider>
    </>
  );
}
