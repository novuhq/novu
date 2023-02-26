import React from 'react';
import styled from '@emotion/styled';
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
    <ListWrapper
      className={cx('nc-notifications-list', css(notificationsListStyles))}
      data-test-id="notifications-scroll-area"
    >
      <InfiniteScroll
        dataLength={totalCount}
        next={onFetch}
        hasMore={hasNextPage}
        height={400}
        loader={<Loader />}
        endMessage={false}
      >
        {notifications.map((notification) => {
          return (
            <NotificationListItem key={notification._id} notification={notification} onClick={onNotificationClicked} />
          );
        })}
      </InfiniteScroll>
    </ListWrapper>
  );
}

const ListWrapper = styled.div``;
