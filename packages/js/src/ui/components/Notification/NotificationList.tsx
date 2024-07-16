import { For, ParentProps, Show } from 'solid-js';
import { FetchFeedArgs } from '../../../feeds';
import { useFeedInfiniteScroll } from '../../api';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';
import { SkeletonAvatar, SkeletonText } from '../primitives/Skeleton';

const NotificationListContainer = (props: ParentProps) => {
  const style = useStyle();

  return (
    <div class={style('notificationListContainer', 'nt-w-[25rem] nt-h-[37.5rem] nt-overflow-auto')}>
      {props.children}
    </div>
  );
};

const NotificationColumn = (props: ParentProps) => {
  const style = useStyle();

  return (
    <div class={style('notificationList', 'nt-flex nt-flex-col nt-min-h-full nt-w-full relative')}>
      {props.children}
    </div>
  );
};
export const EmptyNotificationList = () => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <NotificationListContainer>
      <NotificationColumn data-empty>
        <div
          class={style(
            'notificationListEmptyNoticeContainer',
            'nt-absolute nt-inset-0 nt-flex nt-flex-col nt-items-center nt-m-auto nt-h-fit nt-w-fit nt-text-foreground-alpha-100'
          )}
        >
          <EmptyIcon />
          <p class={style('notificationListEmptyNotice')}>{t('notifications.emptyNotice')}</p>
        </div>
      </NotificationColumn>
    </NotificationListContainer>
  );
};

const NotificationSkeleton = () => {
  return (
    <>
      {/* eslint-disable-next-line local-rules/no-class-without-style */}
      <div class="nt-flex nt-gap-2 nt-p-4">
        <SkeletonAvatar appearanceKey="skeletonAvatar" />
        {/* eslint-disable-next-line local-rules/no-class-without-style */}
        <div class={'nt-flex nt-flex-col nt-self-stretch nt-gap-3 nt-flex-1'}>
          <SkeletonText appearanceKey="skeletonText" class="nt-w-1/4" />
          {/* eslint-disable-next-line local-rules/no-class-without-style */}
          <div class="nt-flex nt-gap-1">
            <SkeletonText appearanceKey="skeletonText" />
            <SkeletonText appearanceKey="skeletonText" />
          </div>
          {/* eslint-disable-next-line local-rules/no-class-without-style */}
          <div class="nt-flex nt-gap-1">
            <SkeletonText appearanceKey="skeletonText" class="nt-w-2/3" />
            <SkeletonText appearanceKey="skeletonText" class="nt-w-1/3" />
          </div>
        </div>
      </div>
    </>
  );
};

type NotificationListSkeletonProps = {
  count: number;
};
export const NotificationListSkeleton = (props: NotificationListSkeletonProps) => {
  return (
    <NotificationListContainer>
      <NotificationColumn data-loading>
        <For each={Array.from({ length: props.count })}>{() => <NotificationSkeleton />}</For>
      </NotificationColumn>
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
      <Show when={data().length !== 0} fallback={<EmptyNotificationList />}>
        <NotificationListContainer>
          <NotificationColumn>
            {/* eslint-disable-next-line local-rules/no-class-without-style */}
            <For each={data()}>{(notification) => <p class="nt-my-10">{notification.body}</p>}</For>
            <Show when={!end()}>
              <div ref={setEl}>
                <For each={Array.from({ length: 3 })}>{() => <NotificationSkeleton />}</For>
              </div>
            </Show>
          </NotificationColumn>
        </NotificationListContainer>
      </Show>
    </Show>
  );
};
