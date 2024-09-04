import { useParams } from 'react-router-dom';
import { IMessage, ButtonTypeEnum } from '@novu/shared';
import { NotificationCenterWidget } from './NotificationCenterWidget';

export interface INotificationCenterWidgetContainerProps {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onActionClick: (templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
}

export function NotificationCenterWidgetContainer(props: INotificationCenterWidgetContainerProps) {
  const { applicationId = '' } = useParams<{ applicationId: string }>();

  return (
    <NotificationCenterWidget
      onNotificationClick={props.onNotificationClick}
      onUrlChange={props.onUrlChange}
      onUnseenCountChanged={props.onUnseenCountChanged}
      onActionClick={props.onActionClick}
      applicationIdentifier={applicationId}
    />
  );
}
