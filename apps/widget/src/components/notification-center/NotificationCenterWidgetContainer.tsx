import { IUserEntity } from '@novu/shared';
import { useMantineColorScheme } from '@mantine/core';
import { useApplication } from '../../api';
import { NotificationCenterWidget } from './NotificationCenterWidget';

export function NotificationCenterWidgetContainer({ user }: { user: IUserEntity | undefined }) {
  const { application } = useApplication();
  const { colorScheme } = useMantineColorScheme();

  return <NotificationCenterWidget user={user} application={application} colorScheme={colorScheme} />;
}
