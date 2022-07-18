import React from 'react';
import styled from 'styled-components';
import { IMessage, ButtonTypeEnum } from '@novu/shared';
import InfiniteScroll from 'react-infinite-scroll-component';
import { NotificationListItem } from './notification-item/NotificationListItem';
import { Loader } from './Loader';

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

  return (
    <ListWrapper data-test-id="notifications-scroll-area">
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
