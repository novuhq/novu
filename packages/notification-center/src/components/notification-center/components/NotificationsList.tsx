import React from 'react';
import { cx, css } from '@emotion/css';
import { IMessage, ButtonTypeEnum } from '@novu/shared';
import InfiniteScroll from 'react-infinite-scroll-component';

import { NotificationListItem } from './notification-item/NotificationListItem';
import { Loader } from './Loader';
import { useStyles } from '../../../store/styles';

export function NotificationsList({
  notifications,
  onFetch,
  hasNextPage,
  onNotificationClicked,
}: {
  notifications: IMessage[] | never;
  onFetch: () => void;
  hasNextPage: boolean;
  onNotificationClicked: (notification: IMessage, actionButtonType?: ButtonTypeEnum) => void;
}) {
  const totalCount = notifications?.length;
  const [notificationsListStyles] = useStyles('notifications.root');

  return (
    <div
      className={cx('nc-notifications-list', notificationsListCss, css(notificationsListStyles))}
      id="notifications-list"
      data-test-id="notifications-scroll-area"
    >
      <InfiniteScroll
        dataLength={totalCount}
        next={onFetch}
        hasMore={hasNextPage}
        loader={<Loader />}
        endMessage={false}
        scrollableTarget="notifications-list"
      >
        {notifications.map((notification) => {
          return (
            <NotificationListItem key={notification._id} notification={notification} onClick={onNotificationClicked} />
          );
        })}
      </InfiniteScroll>
    </div>
  );
}

const notificationsListCss = css`
  height: 400px;
  overflow-y: auto;
`;
