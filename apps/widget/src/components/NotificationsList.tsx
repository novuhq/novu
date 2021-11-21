import styled from 'styled-components';
import { IMessage } from '@notifire/shared';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Spin } from 'antd';
import { NotificationListItem } from './NotificationListItem';

export function NotificationsList({
  notifications,
  onFetch,
  hasNextPage,
  onNotificationClicked,
}: {
  notifications: IMessage[][] | never;
  onFetch: () => void;
  hasNextPage: boolean;
  onNotificationClicked: (notification: IMessage) => void;
}) {
  const totalCount = notifications.reduce((h, i) => {
    const newCount = h + i.length;
    return newCount;
  }, 0);

  return (
    <ListWrapper data-test-id="notifications-scroll-area">
      <InfiniteScroll
        dataLength={totalCount}
        next={onFetch}
        hasMore={hasNextPage}
        height={400}
        loader={<Spin />}
        endMessage={false}>
        {notifications.map((page) => {
          return page.map((notification) => (
            <NotificationListItem key={notification._id} notification={notification} onClick={onNotificationClicked} />
          ));
        })}
      </InfiniteScroll>
    </ListWrapper>
  );
}

const ListWrapper = styled.div``;
