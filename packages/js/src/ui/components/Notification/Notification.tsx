import { Show } from 'solid-js';
import type { Notification as NotificationType } from '../../../notifications';
import type {
  BodyRenderer,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  SubjectRenderer,
} from '../../types';
import { ExternalElementRenderer } from '../ExternalElementRenderer';
import { DefaultNotification } from './DefaultNotification';

type NotificationProps = {
  notification: NotificationType;
  renderNotification?: NotificationRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
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
          renderSubject={props.renderSubject}
          renderBody={props.renderBody}
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
