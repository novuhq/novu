import { createMemo, createSignal, For, ParentProps, Show } from 'solid-js';
import { ListNotificationsArgs } from '../../../notifications';
import { NotificationFilter } from '../../../types';
import { areTagsEqual } from '../../../utils/notification-utils';
import { useNotificationsInfiniteScroll } from '../../api';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { useWebSocketEvent } from '../../helpers/useWebSocketEvent';
import { EmptyIcon } from '../../icons/EmptyIcon';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationMounter } from '../../types';
import { Button } from '../primitives';
import { Notification } from './Notification';
import { NotificationListSkeleton, NotificationSkeleton } from './NotificationListSkeleton';

export const NotificationListContainer = (props: ParentProps) => {
  const style = useStyle();

  return (
    <div class={style('notificationList', 'nt-flex nt-flex-col nt-w-full nt-h-full nt-overflow-auto')}>
      {props.children}
    </div>
  );
};

const EmptyNotificationList = () => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <NotificationListContainer>
      <div
        class={style(
          'notificationListEmptyNoticeContainer',
          'nt-absolute nt-inset-0 nt-flex nt-flex-col nt-items-center nt-m-auto nt-h-fit nt-w-full nt-text-foreground-alpha-100'
        )}
      >
        <EmptyIcon />
        <p class={style('notificationListEmptyNotice')}>{t('notifications.emptyNotice')}</p>
      </div>
    </NotificationListContainer>
  );
};

type NotificationListProps = {
  mountNotification?: NotificationMounter;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  options?: ListNotificationsArgs;
  filter?: NotificationFilter;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const NotificationList = (props: NotificationListProps) => {
  const { data, initialLoading, setEl, end } = useNotificationsInfiniteScroll({ options: props.options });
  const [newNotificationsCount, setNewNotificationsCount] = createSignal(0);
  const { t } = useLocalization();
  const style = useStyle();
  const filter = createMemo(() => props.filter || {});

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: async (data) => {
      const notification = data.result;
      if (!areTagsEqual(filter().tags, notification.tags)) {
        return;
      }

      setNewNotificationsCount((c) => c + 1);
    },
  });

  return (
    <Show when={!initialLoading()} fallback={<NotificationListSkeleton count={8} />}>
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
        <Show when={!!newNotificationsCount()}>
          <div
            class={style(
              'notificationListNewNotificationsNoticeContainer',
              'nt-h-0 nt-w-full nt-flex nt-justify-center nt-top-4 nt-z-10'
            )}
          >
            <Button
              appearanceKey="notificationListNewNotificationsNotice__button"
              class="nt-sticky nt-self-center nt-rounded-full nt-mt-1 hover:nt-bg-primary-600 nt-animate-fade-down"
            >
              {t('notifications.newNotifications', { notificationCount: newNotificationsCount() })}
            </Button>
          </div>
        </Show>
        <NotificationListContainer>
          <For each={data()}>
            {(notification) => (
              <Notification
                notification={notification}
                mountNotification={props.mountNotification}
                onNotificationClick={props.onNotificationClick}
                onPrimaryActionClick={props.onPrimaryActionClick}
                onSecondaryActionClick={props.onSecondaryActionClick}
              />
            )}
          </For>
          <Show when={!end()}>
            <div ref={setEl}>
              <For each={Array.from({ length: 3 })}>{() => <NotificationSkeleton />}</For>
            </div>
          </Show>
        </NotificationListContainer>
      </Show>
    </Show>
  );
};
