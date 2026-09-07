import type { Notification } from '../../../notifications';
import { useInboxContext } from '../../context';
import { notificationItemStyles } from '../../core/style/tables';
import { useStyle } from '../../helpers';
import { InboxAppearanceCallback } from '../../types';
import { renderNotificationActions } from './NotificationActions';

export type NotificationDefaultActionsProps = {
  notification: Notification;
};

/**
 * The read, archive and snooze controls of an item. The Solid item renders it inline; host-native items mount it
 * as an island, so the dropdowns, tooltips and pickers exist once, in the engine.
 */
export const NotificationDefaultActions = (props: NotificationDefaultActionsProps) => {
  const style = useStyle();
  const { status } = useInboxContext();

  return (
    <div
      class={style({
        key: notificationItemStyles.defaultActions.key,
        className: notificationItemStyles.defaultActions.className,
        context: { notification: props.notification } satisfies Parameters<
          InboxAppearanceCallback['notificationDefaultActions']
        >[0],
      })}
    >
      {renderNotificationActions(props.notification, status)}
    </div>
  );
};
