import { JSX, createMemo, createSignal, For, ParentComponent, Setter, Show, Suspense } from 'solid-js';
import type { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { useLocalization, useNewMessagesCount } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationMounter } from '../../types';
import { NewMessagesCta } from './NewMessagesCta';
import { Notification } from './Notification';
import { NotificationListSkeleton, NotificationSkeleton } from './NotificationListSkeleton';

export const NotificationListContainer: ParentComponent<{ ref?: Setter<HTMLElement | null> }> = (props) => {
  const style = useStyle();

  return (
    <div class={style('notificationList', 'nt-flex nt-flex-col nt-w-full nt-h-full nt-overflow-auto')} ref={props.ref}>
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

const NotificationListWrapper = (props: NotificationListProps) => {
  const options = createMemo(() => ({ ...props.filter, limit: props.limit }));
  const { data, setEl, end, refetch } = useNotificationsInfiniteScroll({ options });
  const { count, reset: resetNewMessagesCount } = useNewMessagesCount({ filter: { tags: props.filter?.tags ?? [] } });

  const handleOnNewMessagesClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = async (e) => {
    e.stopPropagation();
    resetNewMessagesCount();
    refetch({ filter: props.filter });
  };

  return (
    <>
      <NewMessagesCta count={count()} onClick={handleOnNewMessagesClick} />
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
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
    </>
  );
};

/* This is also going to be exported as a separate component. Keep it pure. */
export const NotificationList = (props: NotificationListProps) => {
  return (
    <Suspense fallback={<NotificationListSkeleton count={8} />}>
      <NotificationListWrapper {...props} />
    </Suspense>
  );
};
