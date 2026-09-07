import { Show } from 'solid-js';
import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import { useInboxContext } from '../../context';
import { createNotificationItemController } from '../../core/item/controller';
import { notificationItemStyles } from '../../core/style/tables';
import { useStyle } from '../../helpers';
import { InboxAppearanceCallback, NotificationActionClickHandler } from '../../types';
import { Button } from '../primitives';

export type NotificationCustomActionsProps = {
  notification: Notification;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

/**
 * The primary and secondary action buttons of an item. The Solid item renders it inline; host-native items mount
 * it as an island.
 */
export const NotificationCustomActions = (props: NotificationCustomActionsProps) => {
  const style = useStyle();
  const { navigate } = useInboxContext();
  const controller = createNotificationItemController({
    notification: () => props.notification,
    handlers: () => props,
    navigate,
  });

  return (
    <Show when={props.notification.primaryAction || props.notification.secondaryAction}>
      <div
        class={style({
          key: notificationItemStyles.customActions.key,
          className: notificationItemStyles.customActions.className,
          context: { notification: props.notification } satisfies Parameters<
            InboxAppearanceCallback['notificationCustomActions']
          >[0],
        })}
      >
        <Show when={props.notification.primaryAction} keyed>
          {(primaryAction) => (
            <Button
              appearanceKey={notificationItemStyles.customActions.primaryKey}
              variant="default"
              onClick={(e) => controller.handleActionClick(ActionTypeEnum.PRIMARY, e)}
              context={{ notification: props.notification }}
            >
              {primaryAction.label}
            </Button>
          )}
        </Show>
        <Show when={props.notification.secondaryAction} keyed>
          {(secondaryAction) => (
            <Button
              appearanceKey={notificationItemStyles.customActions.secondaryKey}
              variant="secondary"
              onClick={(e) => controller.handleActionClick(ActionTypeEnum.SECONDARY, e)}
              context={{ notification: props.notification }}
            >
              {secondaryAction.label}
            </Button>
          )}
        </Show>
      </div>
    </Show>
  );
};
