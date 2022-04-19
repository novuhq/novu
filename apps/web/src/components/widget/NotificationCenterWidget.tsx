import { NotificationBell, NovuProvider, PopoverNotificationCenter } from '@novu/bell';
import { useEnvironment } from '../../api/hooks/use-environment';
import { IUserEntity } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { environment } = useEnvironment();
  const { colorScheme } = useMantineColorScheme();

  return (
    <NovuProvider
      subscriberId={user?._id as string}
      applicationIdentifier={environment?.identifier as string}
      colorScheme={colorScheme}
    >
      <PopoverNotificationCenter>{(props) => <NotificationBell {...props} />}</PopoverNotificationCenter>
    </NovuProvider>
  );
}
