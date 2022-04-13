import { ColorScheme, NotificationBell, NotificationCenter, NovuProvider } from '@novu/bell';
import { IApplication, IUserEntity } from '@novu/shared';

export function NotificationCenterWidget({
  user,
  application,
  colorScheme,
}: {
  user: IUserEntity | undefined;
  application: IApplication | undefined;
  colorScheme: ColorScheme;
}) {
  return (
    <NovuProvider
      subscriberId={user?._id as string}
      applicationIdentifier={application?.identifier as string}
      colorScheme={colorScheme}>
      <NotificationCenter bell={<NotificationBell />} />
    </NovuProvider>
  );
}
