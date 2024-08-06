import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  ParentComponent,
  Setter,
  Show,
  Suspense,
} from 'solid-js';
import type { NotificationFilter } from '../../../types';
import { useNotificationsInfiniteScroll } from '../../api';
import { useLocalization, useNewMessagesCount } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
import type { NotificationActionClickHandler, NotificationClickHandler, NotificationMounter } from '../../types';
import { Button } from '../primitives';
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
  const [notificationListContainerRef, setNotificationListContainerRef] = createSignal<HTMLElement | null>(null);

  return (
    <>
      <NewMessageCTA filter={props.filter} containerRef={notificationListContainerRef} refetch={refetch} />
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
        <NotificationListContainer ref={setNotificationListContainerRef}>
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

const NewMessageCTA: Component<{
  filter?: NotificationListProps['filter'];
  containerRef: Accessor<HTMLElement | null>;
  refetch?: ({ filter }: { filter?: NotificationFilter }) => Promise<void>;
}> = (props) => {
  const style = useStyle();
  const { t } = useLocalization();
  const { count, reset: resetNewMessagesCount } = useNewMessagesCount({ tags: props.filter?.tags ?? [] });
  const [shouldRender, setRender] = createSignal(!!count());
  const onAnimationEnd = () => count() < 1 && setRender(false);

  createEffect(() => count() > 0 && setRender(true));

  const handleClick = async () => {
    resetNewMessagesCount();
    await props.refetch?.({ filter: props.filter ?? undefined });
    props.containerRef()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Show when={shouldRender()}>
      <div
        class={style(
          'notificationListNewNotificationsNoticeContainer',
          'nt-relative nt-h-0 nt-w-full nt-flex nt-justify-center nt-top-4 nt-z-10'
        )}
      >
        <Button
          appearanceKey="notificationListNewNotificationsNotice__button"
          class={`nt-sticky nt-self-center nt-rounded-full nt-mt-1 hover:nt-bg-primary-600 ${
            count() < 1 ? 'nt-animate-fade-up nt-opacity-0' : 'nt-animate-fade-down'
          }`}
          onClick={handleClick}
          /**
           * onAnimationEnd is is a native HTML event that is triggered when a CSS animation has completed.
           * Ref: https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event
           */
          onAnimationEnd={onAnimationEnd}
        >
          {t('notifications.newNotifications', { notificationCount: count() })}
        </Button>
      </div>
    </Show>
  );
};
