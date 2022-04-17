import { NotificationCenter, NovuProvider } from '@novu/bell';
import { IMessage } from '@novu/shared';

interface INotificationCenterWidgetProps {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  applicationIdentifier: string | undefined;
}

export function NotificationCenterWidget(props: INotificationCenterWidgetProps) {
  return (
    <NovuProvider applicationIdentifier={props.applicationIdentifier as string} colorScheme="light">
      <NotificationCenter
        onNotificationClick={props.onNotificationClick}
        onUrlChange={props.onUrlChange}
        onUnseenCountChanged={props.onUnseenCountChanged}
      />
    </NovuProvider>
  );
}
