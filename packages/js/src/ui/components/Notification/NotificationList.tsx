import { createEffect, createMemo, For, JSX, Show } from 'solid-js';
import type { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { DEFAULT_LIMIT, useInboxContext, useNewMessagesCount } from '../../context';
import { useStyle } from '../../helpers';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationRenderer } from '../../types';
import { NewMessagesCta } from './NewMessagesCta';
import { Notification } from './Notification';
import { NotificationListSkeleton } from './NotificationListSkeleton';

type NotificationListProps = {
  renderNotification?: NotificationRenderer;
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
  const { setLimit } = useInboxContext();
  const ids = createMemo(() => data().map((n) => n.id));
  let notificationListElement: HTMLDivElement;

  createEffect(() => {
    setLimit(props.limit || DEFAULT_LIMIT);
  });

  const handleOnNewMessagesClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = async (e) => {
    e.stopPropagation();
    resetNewMessagesCount();
    refetch({ filter: props.filter });
    notificationListElement.scrollTo({ top: 0 });
  };

  return (
    <div
      class={style(
        'notificationListContainer',
        'nt-relative nt-border-t nt-border-t-neutral-alpha-200 nt-h-full nt-overflow-hidden'
      )}
    >
      <NewMessagesCta count={count()} onClick={handleOnNewMessagesClick} />
      <div
        ref={(el) => {
          notificationListElement = el;
        }}
        class={style('notificationList', 'nt-relative nt-h-full nt-flex nt-flex-col nt-overflow-y-auto')}
      >
        <Show when={data().length > 0} fallback={<NotificationListSkeleton loading={initialLoading()} />}>
          <For each={ids()}>
            {(_, index) => {
              const notification = () => data()[index()];

              return (
                <Notification
                  notification={notification()}
                  renderNotification={props.renderNotification}
                  onNotificationClick={props.onNotificationClick}
                  onPrimaryActionClick={props.onPrimaryActionClick}
                  onSecondaryActionClick={props.onSecondaryActionClick}
                />
              );
            }}
          </For>
          <Show when={!end()}>
            <div ref={setEl}>
              <For each={Array.from({ length: 3 })}>{() => <NotificationListSkeleton loading={true} />}</For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
};
