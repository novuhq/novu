import { For, ParentProps, Show } from 'solid-js';
import { ListNotificationsArgs } from '../../../notifications';
import { useNotificationsInfiniteScroll } from '../../api';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationMounter } from '../../types';
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
  onActionClick?: NotificationActionClickHandler;
  options?: ListNotificationsArgs;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const NotificationList = (props: NotificationListProps) => {
  const [data, { initialLoading, setEl, end }] = useNotificationsInfiniteScroll({ options: props.options });

  return (
    <Show when={!initialLoading()} fallback={<NotificationListSkeleton count={8} />}>
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
        <NotificationListContainer>
          <For each={data()}>
            {(notification) => (
              <Notification
                notification={notification}
                mountNotification={props.mountNotification}
                onNotificationClick={props.onNotificationClick}
                onActionClick={props.onActionClick}
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
