import { type Accessor, createEffect, createMemo, For, JSX, onCleanup, onMount, Show } from 'solid-js';
import type { Notification as NotificationType } from '../../../notifications';
import type { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { DEFAULT_LIMIT, useInboxContext, useNewMessagesCount } from '../../context';
import { useMotion, useStyle } from '../../helpers';
import { createListPresence } from '../../helpers/createListPresence';
import {
  animateItemEnter,
  animateItemExit,
  fadeInList,
  fadeOutList,
  isItemOnScreen,
  moveFocusOutOf,
} from '../../helpers/listMotion';
import { useNotificationVisibility } from '../../helpers/useNotificationVisibility';
import type {
  AvatarRenderer,
  BodyRenderer,
  CustomActionsRenderer,
  DefaultActionsRenderer,
  InboxAppearanceCallback,
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
  const motion = useMotion();
  const { data, setEl, end, refetch, initialLoading } = useNotificationsInfiniteScroll({ options });
  const { count, reset: resetNewMessagesCount } = useNewMessagesCount({
    filter: { tags: props.filter?.tags ?? [], data: props.filter?.data ?? {}, severity: props.filter?.severity },
  });
  const { setLimit } = useInboxContext();
  const ids = createMemo(() => data().map((n) => n.id));
  const byId = createMemo(() => new Map(data().map((notification) => [notification.id, notification] as const)));
  const { observeNotification, unobserveNotification } = useNotificationVisibility();
  let notificationListElement: HTMLDivElement | undefined;

  // Items that are there before the list was first painted (from the cache) appear with whatever brought the list in,
  // such as the Inbox opening or a tab panel fading in. Fading the list as well would play a second fade over it.
  let hasPainted = typeof requestAnimationFrame !== 'function';
  onMount(() => {
    if (hasPainted) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      hasPainted = true;
    });
    onCleanup(() => cancelAnimationFrame(frame));
  });

  // Removed items stay rendered (inert) while they animate out, so the list doesn't jump and a host-rendered item
  // keeps its content until it is gone; items inserted at the top expand in.
  const presence = createListPresence<string>({
    keys: ids,
    ready: () => !initialLoading(),
    motion,
    isOnScreen: (item) => isItemOnScreen(item, notificationListElement),
    exit: animateItemExit,
    enter: animateItemEnter,
    onLeave: (_, item) => {
      moveFocusOutOf(item);
      unobserveNotification(item);
    },
    onRestore: (id, item) => observeNotification(item, id),
    // A filter change or a refetch: the items fade out, then the new content fades in from its top.
    exitList: (mode) => {
      const animation = fadeOutList(notificationListElement, mode);
      animation?.finished.then(
        () => notificationListElement?.scrollTo({ top: 0 }),
        () => {}
      );

      return animation;
    },
    enterList: (kind) => {
      if (kind !== 'load' || hasPainted) {
        fadeInList(notificationListElement, motion());
      }
    },
  });

  createEffect(() => {
    setLimit(props.limit || DEFAULT_LIMIT);
  });

  const handleOnNewMessagesClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = async (e) => {
    e.stopPropagation();
    resetNewMessagesCount();
    refetch({ filter: props.filter });
    notificationListElement?.scrollTo({ top: 0 });
  };

  return (
    <div
      class={style({
        key: 'notificationListContainer',
        className: 'nt-relative nt-border-t nt-border-t-neutral-alpha-200 nt-h-full nt-overflow-hidden',
        context: { notifications: data() } satisfies Parameters<
          InboxAppearanceCallback['notificationListContainer']
        >[0],
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
          context: { notifications: data() } satisfies Parameters<InboxAppearanceCallback['notificationList']>[0],
        })}
      >
        <Show when={presence.rendered().length > 0} fallback={<NotificationListSkeleton loading={initialLoading()} />}>
          <For each={presence.rendered()}>
            {(id) => {
              // A leaving item is no longer in `data()`; it keeps rendering its last snapshot until it is gone. An item is
              // only created for a key that is in `data()`, so the first value is always there.
              const notification = createMemo<NotificationType | undefined>(
                (last) => byId().get(id) ?? last
              ) as Accessor<NotificationType>;

              return (
                <div
                  // An item that collapses (`overflow: hidden`) would otherwise shrink to nothing at once in a list that
                  // overflows, instead of animating its height.
                  class="nt-shrink-0"
                  ref={(el) => {
                    presence.register(id, el);
                    // Start observing this notification for visibility tracking
                    observeNotification(el, id);

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
