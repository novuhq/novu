import { NotificationCenter } from '@novu/bell';
import { useApplication } from '../../api/hooks/use-application';

export function NotificationCenterWidget() {
  const { loading: isLoadingApplication } = useApplication();

  return (
    <NotificationCenter
      sendNotificationClick={() => {}}
      sendUrlChange={() => {}}
      onUnseenCountChanged={() => {}}
      isLoading={isLoadingApplication}
    />
  );
}
