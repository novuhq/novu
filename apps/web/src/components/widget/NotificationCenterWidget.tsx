import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/bell';
import { useApplication } from '../../api/hooks/use-application';
import { IUserEntity } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { application } = useApplication();
  const { colorScheme } = useMantineColorScheme();

  return (
    <NovuProvider
      subscriberId={user?._id as string}
      applicationIdentifier={application?.identifier as string}
      colorScheme={colorScheme}>
      <PopoverNotificationCenter bell={<NotificationBell />} />
    </NovuProvider>
  );
}
