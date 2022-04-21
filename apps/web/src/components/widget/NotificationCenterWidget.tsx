import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/bell';
import { useEnvironment } from '../../api/hooks/use-environment';
import { IUserEntity } from '@novu/shared';
import { Skeleton, useMantineColorScheme } from '@mantine/core';
import React, { useState } from 'react';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvironment();
  const { colorScheme } = useMantineColorScheme();

  function handlerOnUrlChange(url: string) {
    window.location.href = url;
  }

  return (
    <>
      <NovuProvider
        subscriberId={user?._id as string}
        applicationIdentifier={environment?.identifier as string}
        colorScheme={colorScheme}
      >
        <PopoverNotificationCenter onUrlChange={handlerOnUrlChange}>
          {(props) => <NotificationBell {...props} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    </>
  );
}
