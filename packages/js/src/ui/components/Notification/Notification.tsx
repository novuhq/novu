import { Show } from 'solid-js';
import type { Notification as NotificationType } from '../../../notifications';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationMounter } from '../../types';
import { ExternalElementMounter } from '../ExternalElementMounter';
import { DefaultNotification } from './DefaultNotification';

type NotificationProps = {
  notification: NotificationType;
  mountNotification?: NotificationMounter;
  onNotificationClick?: NotificationClickHandler;
  onActionClick?: NotificationActionClickHandler;
};

export const Notification = (props: NotificationProps) => {
  return (
    <Show
      when={props.mountNotification}
      fallback={
        <DefaultNotification
          notification={props.notification}
          onNotificationClick={props.onNotificationClick}
          onActionClick={props.onActionClick}
        />
      }
    >
      <ExternalElementMounter
        mount={(el) =>
          props.mountNotification!(el, {
            notification: props.notification,
          })
        }
      />
    </Show>
  );
};
