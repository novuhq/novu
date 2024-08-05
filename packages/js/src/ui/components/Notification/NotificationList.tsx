import { createMemo, For, ParentProps, Show } from 'solid-js';
import { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { useUnreadCount, useLocalization } from '../../context';
import { useStyle } from '../../helpers';
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
  limit?: number | undefined;
  filter?: NotificationFilter;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const NotificationList = (props: NotificationListProps) => {
  const { t } = useLocalization();
  const style = useStyle();
  const options = createMemo(() => ({ ...props.filter, limit: props.limit } ?? {}));
  const { data, initialLoading, setEl, end } = useNotificationsInfiniteScroll({ options });
  const { count } = useUnreadCount({ tags: props.filter?.tags ?? [] });

  return (
    <Show when={!initialLoading()} fallback={<NotificationListSkeleton count={8} />}>
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
        <Show when={!!count()}>
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
              {t('notifications.newNotifications', { notificationCount: count() })}
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
