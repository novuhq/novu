import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/bell';
import { useApplication } from '../../api/hooks/use-application';
import { IUserEntity } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import { useState } from 'react';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { application } = useApplication();
  const { colorScheme } = useMantineColorScheme();
  const [unseenCount, setUnseenCount] = useState<number>(0);

  function unseenChanged(count: number) {
    setUnseenCount(count);
  }

  return (
    <NovuProvider
      subscriberId={user?._id as string}
      applicationIdentifier={application?.identifier as string}
      colorScheme={colorScheme}>
      <PopoverNotificationCenter onUnseenCountChanged={unseenChanged} unseenCount={unseenCount}>
        {(props) => <NotificationBell {...props} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
