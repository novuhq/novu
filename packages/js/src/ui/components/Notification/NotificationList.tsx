import { For, ParentProps, Show } from 'solid-js';
import { Notification } from '../../../feeds';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { EmptyIcon } from '../../icons/EmptyIcon';

type NotificationListProps = {
  notifications: Notification[];
};

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

export const NotificationList = (props: NotificationListProps) => {
  return (
    <NotificationListContainer>
      <NotificationColumn>
        <For each={props.notifications}>{(notification) => <p>{notification.body}</p>}</For>
      </NotificationColumn>
    </NotificationListContainer>
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
            'notificationList_emptyNoticeContainer',
            'nt-absolute nt-inset-0 nt-flex nt-flex-col nt-items-center nt-m-auto nt-h-fit nt-w-fit nt-text-foreground-alpha-100'
          )}
        >
          <EmptyIcon />
          <p class={style('notificationList_emptyNotice')}>{t('notifications.emptyNotice')}</p>
        </div>
      </NotificationColumn>
    </NotificationListContainer>
  );
};
