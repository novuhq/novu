import { NotificationCenter, NovuProvider } from '@novu/bell';
import jwtDecode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';
import { API_ROOT } from '../../config';
import { useApplication } from '../../api/hooks/use-application';

export function NotificationCenterWidget({ token }: { token: string }) {
  const { application, loading: isLoadingApplication } = useApplication();
  const userData = jwtDecode<IJwtPayload>(token);

  return (
    <>
      <NovuProvider
        backendUrl={API_ROOT}
        userId={userData._id}
        clientId={application?.identifier || ''}
        firstName={userData.firstName || ''}
        lastName={userData.lastName || ''}
        email={userData.email || ''}
        phone={''}
        appId={userData.applicationId || ''}>
        <NotificationCenter
          onUnseenCountChanged={() => {}}
          sendNotificationClick={() => {}}
          sendUrlChange={() => {}}
          isLoading={isLoadingApplication}
        />
      </NovuProvider>
    </>
  );
}
