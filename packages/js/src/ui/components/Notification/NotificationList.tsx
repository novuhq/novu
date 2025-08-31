import { createEffect, createMemo, For, JSX, onCleanup, Show } from 'solid-js';
import type { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { DEFAULT_LIMIT, useInboxContext, useNewMessagesCount } from '../../context';
import { useStyle } from '../../helpers';
import { useNotificationVisibility } from '../../helpers/useNotificationVisibility';
import type {
  AppearanceCallback,
  AvatarRenderer,
  BodyRenderer,
  CustomActionsRenderer,
  DefaultActionsRenderer,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  SubjectRenderer,
} from '../../types';
import { NewMessagesCta } from './NewMessagesCta';
import { Notification } from './Notification';
import { NotificationListSkeleton } from './NotificationListSkeleton';

type NotificationListProps = {
  renderNotification?: NotificationRenderer;
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
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
  const { count, reset: resetNewMessagesCount } = useNewMessagesCount({
    filter: { tags: props.filter?.tags ?? [], data: props.filter?.data ?? {}, severity: props.filter?.severity },
  });
  const { setLimit } = useInboxContext();
  const ids = createMemo(() => data().map((n) => n.id));
  const { observeNotification, unobserveNotification } = useNotificationVisibility();
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
      class={style({
        key: 'notificationListContainer',
        className: 'nt-relative nt-border-t nt-border-t-neutral-alpha-200 nt-h-full nt-overflow-hidden',
        context: { notifications: data() } satisfies Parameters<AppearanceCallback['notificationListContainer']>[0],
      })}
    >
      <NewMessagesCta count={count()} onClick={handleOnNewMessagesClick} />
      <div
        ref={(el) => {
          notificationListElement = el;
        }}
        class={style({
          key: 'notificationList',
          className: 'nt-relative nt-h-full nt-flex nt-flex-col nt-overflow-y-auto',
          context: { notifications: data() } satisfies Parameters<AppearanceCallback['notificationList']>[0],
        })}
      >
        <Show when={data().length > 0} fallback={<NotificationListSkeleton loading={initialLoading()} />}>
          <For each={ids()}>
            {(_, index) => {
              const notification = () => data()[index()];

              return (
                <div
                  ref={(el) => {
                    // Start observing this notification for visibility tracking
                    observeNotification(el, notification().id);

                    // Set up cleanup when element is removed
                    const observer = new MutationObserver((mutations) => {
                      mutations.forEach((mutation) => {
                        mutation.removedNodes.forEach((node) => {
                          if (node === el) {
                            unobserveNotification(el);
                            observer.disconnect();
                          }
                        });
                      });
                    });

                    if (el.parentElement) {
                      observer.observe(el.parentElement, { childList: true });
                    }

                    // Cleanup function to disconnect observer when ref changes
                    onCleanup(() => {
                      observer.disconnect();
                      unobserveNotification(el);
                    });
                  }}
                >
                  <Notification
                    notification={notification()}
                    renderNotification={props.renderNotification}
                    renderAvatar={props.renderAvatar}
                    renderSubject={props.renderSubject}
                    renderBody={props.renderBody}
                    renderDefaultActions={props.renderDefaultActions}
                    renderCustomActions={props.renderCustomActions}
                    onNotificationClick={props.onNotificationClick}
                    onPrimaryActionClick={props.onPrimaryActionClick}
                    onSecondaryActionClick={props.onSecondaryActionClick}
                  />
                </div>
              );
            }}
          </For>
          <Show when={!end()}>
            <div ref={setEl}>
              <NotificationListSkeleton loading={true} />
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
};
