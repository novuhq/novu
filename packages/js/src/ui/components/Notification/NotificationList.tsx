import { For, ParentProps, Show } from 'solid-js';
import { FetchFeedArgs } from '../../../feeds';
import { useFeedInfiniteScroll } from '../../api';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
import { NotificationMounter } from '../../types';
import { Notification } from './Notification';
import { NotificationListSkeleton, NotificationSkeleton } from './NotificationListSkeleton';

export const NotificationListContainer = (props: ParentProps) => {
  const style = useStyle();

  return (
    <div
      class={style('notificationList', 'nt-flex nt-flex-col nt-min-h-full nt-w-full nt-h-[37.5rem] nt-overflow-auto')}
    >
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
          'nt-absolute nt-inset-0 nt-flex nt-flex-col nt-items-center nt-m-auto nt-h-fit nt-w-fit nt-text-foreground-alpha-100'
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
  options?: FetchFeedArgs;
};
/* This is also going to be exported as a separate component. Keep it pure. */
export const NotificationList = (props: NotificationListProps) => {
  const [data, { initialLoading, setEl, end }] = useFeedInfiniteScroll({ options: props.options });

  return (
    <Show when={!initialLoading()} fallback={<NotificationListSkeleton count={8} />}>
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
        <NotificationListContainer>
          <For each={data()}>
            {(notification) => <Notification notification={notification} mountNotification={props.mountNotification} />}
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
