import { For, ParentProps, Show } from 'solid-js';
import { FetchFeedArgs } from '../../../feeds';
import { useFeedInfiniteScroll } from '../../api';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
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
  options?: FetchFeedArgs;
};
export const NotificationList = (props: NotificationListProps) => {
  const [data, { initialLoading, setEl, end }] = useFeedInfiniteScroll({ options: props.options });

  return (
    <Show when={!initialLoading()} fallback={<NotificationListSkeleton count={8} />}>
      <Show when={data().length > 0} fallback={<EmptyNotificationList />}>
        <NotificationListContainer>
          {/* eslint-disable-next-line local-rules/no-class-without-style */}
          <For each={data()}>{(notification) => <p class="nt-my-10">{notification.body}</p>}</For>
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
