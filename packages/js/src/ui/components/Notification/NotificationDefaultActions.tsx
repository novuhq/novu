import { Match, Show, Switch } from 'solid-js';
import type { Notification } from '../../../notifications';
import { useInboxContext } from '../../context';
import { notificationItemStyles } from '../../core/style/tables';
import { useStyle } from '../../helpers';
import { InboxAppearanceCallback, NotificationStatus } from '../../types';
import { ArchiveButton, SnoozeButton, ToggleReadButton, UnarchiveButton, UnsnoozeButton } from './NotificationActions';

export type NotificationDefaultActionsProps = {
  notification: Notification;
};

/**
 * The read, archive and snooze controls of an item. The Solid item renders it inline; host-native items mount it
 * as an island, so the dropdowns, tooltips and pickers exist once, in the engine.
 *
 * Every button reads the notification reactively, so a new snapshot with the same values changes nothing and a
 * flipped `isRead` only updates the toggle button. The group itself is only rebuilt when the notification moves
 * between the normal, archived and snoozed states.
 */
export const NotificationDefaultActions = (props: NotificationDefaultActionsProps) => {
  const style = useStyle();
  const { status, isSnoozeEnabled } = useInboxContext();

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
      <Switch
        fallback={
          <>
            <Show when={status() !== NotificationStatus.ARCHIVED}>
              <ToggleReadButton notification={props.notification} />
            </Show>
            <Show when={isSnoozeEnabled()}>
              <SnoozeButton notification={props.notification} />
            </Show>
            <ArchiveButton notification={props.notification} />
          </>
        }
      >
        <Match when={props.notification.isSnoozed}>
          <UnsnoozeButton notification={props.notification} />
        </Match>
        <Match when={props.notification.isArchived}>
          <UnarchiveButton notification={props.notification} />
        </Match>
      </Switch>
    </div>
  );
};
