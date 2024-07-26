import { ParentProps, Show } from 'solid-js';
import { InboxNotification } from '../../../types';
import { formatToRelativeTime, useStyle } from '../../helpers';
import { Archive, ReadAll, Unarchive } from '../../icons';
import { Button } from '../primitives';

type NotificationBodyProps = ParentProps;
const NotificationBody = (props: NotificationBodyProps) => {
  const style = useStyle();

  return <p class={style('notificationBody')}>{props.children}</p>;
};

type DefaultNotificationProps = {
  notification: InboxNotification;
};

//TODO: Complete the implementation
export const DefaultNotification = (props: DefaultNotificationProps) => {
  const style = useStyle();

  return (
    <div
      class={style(
        'notification',
        'nt-w-full nt-text-sm hover:nt-bg-neutral-100 nt-group nt-relative nt-flex nt-px-6 nt-py-4 nt-gap-2'
      )}
    >
      <span
        class={style(
          'notificationDot',
          'nt-absolute -nt-translate-x-[150%] nt-translate-y-1/2 nt-size-2.5 nt-bg-primary nt-rounded-full nt-border'
        )}
      />
      <Show when={props.notification.avatar}>
        <img class={style('notificationImage', 'nt-size-8 nt-rounded-lg')} src={props.notification.avatar} />
      </Show>
      <div class={style('notificationBody', 'nt-overflow-hidden nt-w-full')}>
        <p
          class={style(
            'notificationDate',
            'nt-text-foreground-alpha-400 nt-shrink-0 nt-float-right group-hover:nt-hidden'
          )}
        >
          {/* TODO: pass locale here */}
          {formatToRelativeTime({ fromDate: new Date(props.notification.createdAt) })}
        </p>
        <div
          class={style(
            'notificationDefaultActions',
            'nt-gap-3 nt-shrink-0 nt-float-right nt-hidden group-hover:nt-flex'
          )}
        >
          <Show
            when={props.notification.isRead}
            fallback={
              <Button size="icon" variant="icon">
                <ReadAll />
              </Button>
            }
          >
            <Button size="icon" variant="icon">
              <Archive />
            </Button>
          </Show>
          <Show
            when={props.notification.isArchived}
            fallback={
              <Button size="icon" variant="icon">
                <Archive />
              </Button>
            }
          >
            <Button size="icon" variant="icon">
              <Unarchive />
            </Button>
          </Show>
        </div>
        <Show when={props.notification.subject} fallback={<NotificationBody>test</NotificationBody>}>
          <p
            class={style(
              'notificationSubject',
              'nt-font-semibold nt-overflow-ellipsis nt-whitespace-nowrap nt-overflow-hidden'
            )}
          >
            {props.notification.subject}
          </p>
        </Show>
        <Show when={props.notification.subject}>
          <NotificationBody>{props.notification.body}</NotificationBody>
        </Show>

        <div class={style('notificationCustomActions', 'nt-flex nt-gap-4 nt-mt-4')}>
          <Show when={props.notification.primaryAction} keyed>
            {(primaryAction) => (
              <Button appearanceKey="notificationPrimaryAction__button" variant="default">
                {primaryAction.label}
              </Button>
            )}
          </Show>
          <Show when={props.notification.primaryAction} keyed>
            {(secondaryAction) => (
              <Button appearanceKey="notificationSecondaryAction__button" variant="secondary">
                {secondaryAction.label}
              </Button>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
};
