import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/bell';
import { useEnvironment } from '../../api/hooks/use-environment';
import { IUserEntity } from '@novu/shared';
import { Skeleton, useMantineColorScheme } from '@mantine/core';
import React, { useState } from 'react';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const [isBellLoading, setIsBellLoading] = useState(true);
  const { environment } = useEnvironment();
  const { colorScheme } = useMantineColorScheme();

  function handlerOnUrlChange(url: string) {
    window.location.href = url;
  }

  function handleBellLoading(isLoading: boolean): void {
    setIsBellLoading(isLoading);
  }

  return (
    <>
      {isBellLoading ? <Skeleton width={28} height={28} /> : null}
      <NovuProvider
        subscriberId={user?._id as string}
        applicationIdentifier={environment?.identifier as string}
        colorScheme={colorScheme}
        bellLoading={handleBellLoading}
      >
        <PopoverNotificationCenter onUrlChange={handlerOnUrlChange}>
          {(props) => <NotificationBell {...props} />}
        </PopoverNotificationCenter>
      </NovuProvider>
    </>
  );
}
