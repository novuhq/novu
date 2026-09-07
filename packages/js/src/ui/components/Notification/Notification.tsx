import { Show } from 'solid-js';
import type { Notification as NotificationType } from '../../../notifications';
import type {
  AvatarRenderer,
  BodyRenderer,
  CustomActionsRenderer,
  DefaultActionsRenderer,
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
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
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
          renderAvatar={props.renderAvatar}
          renderSubject={props.renderSubject}
          renderBody={props.renderBody}
          renderDefaultActions={props.renderDefaultActions}
          renderCustomActions={props.renderCustomActions}
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
