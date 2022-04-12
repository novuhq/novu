import { NotificationCenter, NovuProvider } from '@novu/bell';
import { useApplication } from '../../api/hooks/use-application';
import { API_ROOT } from '../../config';
import { IUserEntity } from '@novu/shared';

export function NotificationCenterWidget({ user }: { user: IUserEntity | undefined }) {
  const { application, loading: isLoadingApplication } = useApplication();

  return (
    <NovuProvider
      backendUrl={API_ROOT}
      userId={user?._id as string}
      clientId={application?.identifier as string}
      firstName={user?.firstName as string}
      lastName={user?.lastName as string}
      email={user?.email as string}
      phone={''}
      appId={application?._id as string}>
      <NotificationCenter
        sendNotificationClick={() => {}}
        sendUrlChange={() => {}}
        onUnseenCountChanged={() => {}}
        isLoading={isLoadingApplication}
      />
    </NovuProvider>
  );
}
