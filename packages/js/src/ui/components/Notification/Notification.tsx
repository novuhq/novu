import { createEffect, onCleanup, Show } from 'solid-js';
import type { Notification as NotificationType } from '../../../notifications';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationRenderer } from '../../types';
import { DefaultNotification } from './DefaultNotification';

type NotificationProps = {
  notification: NotificationType;
  renderNotification?: NotificationRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const Notification = (props: NotificationProps) => {
  let ref: HTMLDivElement;

  createEffect(() => {
    const unmount = props.renderNotification?.(ref, props.notification);

    onCleanup(() => {
      unmount?.();
    });
  });

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
      <div
        ref={(el) => {
          ref = el;
        }}
      />
    </Show>
  );
};
