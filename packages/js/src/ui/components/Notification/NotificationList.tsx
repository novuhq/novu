import { createMemo, For, JSX, Show } from 'solid-js';
import type { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { useLocalization, useNewMessagesCount } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationMounter } from '../../types';
import { NewMessagesCta } from './NewMessagesCta';
import { Notification } from './Notification';
import { NotificationListSkeleton, NotificationSkeleton } from './NotificationListSkeleton';

const EmptyNotificationList = () => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div
      class={style(
        'notificationListEmptyNoticeContainer',
        'nt-absolute nt-inset-0 nt-flex nt-flex-col nt-items-center nt-m-auto nt-h-fit nt-w-full nt-text-foreground-alpha-100'
      )}
    >
      <EmptyIcon />
      <p class={style('notificationListEmptyNotice')}>{t('notifications.emptyNotice')}</p>
    </div>
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

export const NotificationList = (props: NotificationListProps) => {
  const options = createMemo(() => ({ ...props.filter, limit: props.limit }));
  const style = useStyle();
  const { data, setEl, end, refetch, initialLoading } = useNotificationsInfiniteScroll({ options });
  const { count, reset: resetNewMessagesCount } = useNewMessagesCount({ filter: { tags: props.filter?.tags ?? [] } });
  let notificationListElement: HTMLDivElement;

  const handleOnNewMessagesClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = async (e) => {
    e.stopPropagation();
    resetNewMessagesCount();
    refetch({ filter: props.filter });
    notificationListElement.scrollTo({ top: 0 });
  };

  return (
    <div class={style('notificationListContainer', 'nt-relative nt-h-full nt-overflow-hidden')}>
      <NewMessagesCta count={count()} onClick={handleOnNewMessagesClick} />
      <div
        ref={(el) => {
          notificationListElement = el;
        }}
        class={style('notificationList', 'nt-relative nt-h-full nt-flex nt-flex-col nt-overflow-y-auto')}
      >
        <Show when={!initialLoading()} fallback={<NotificationListSkeleton count={8} />}>
          <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
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
          </Show>
        </Show>
      </div>
    </div>
  );
};
