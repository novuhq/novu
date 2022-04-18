import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/bell';
import { useEnvironment } from '../../api/hooks/use-environment';
import { IUserEntity } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import { useState } from 'react';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvironment();
  const { colorScheme } = useMantineColorScheme();
  const [unseenCount, setUnseenCount] = useState<number>(0);

  function unseenChanged(count: number) {
    setUnseenCount(count);
  }

  return (
    <NovuProvider
      subscriberId={user?._id as string}
      applicationIdentifier={environment?.identifier as string}
      colorScheme={colorScheme}
    >
      <PopoverNotificationCenter onUnseenCountChanged={unseenChanged} unseenCount={unseenCount}>
        {(props) => <NotificationBell {...props} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
