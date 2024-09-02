import { Show } from 'solid-js';
import type { Notification as NotificationType } from '../../../notifications';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationRenderer } from '../../types';
import { ExternalElementRenderer } from '../ExternalElementRenderer';
import { DefaultNotification } from './DefaultNotification';

type NotificationProps = {
  notification: NotificationType;
  renderNotification?: NotificationRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const Notification = (props: NotificationProps) => {
  return (
    <Show
      when={props.renderNotification}
      fallback={
        <DefaultNotification
          notification={props.notification}
          onNotificationClick={props.onNotificationClick}
          onPrimaryActionClick={props.onPrimaryActionClick}
          onSecondaryActionClick={props.onSecondaryActionClick}
        />
      }
    >
      <ExternalElementRenderer render={(el) => props.renderNotification!(el, props.notification)} />
    </Show>
  );
};
