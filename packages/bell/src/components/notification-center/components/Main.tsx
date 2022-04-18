import React, { useContext, useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation } from 'react-query';
import { ChannelCTATypeEnum, IMessage } from '@novu/shared';
import styled from 'styled-components';
import { NotificationsList } from './NotificationsList';
import { getNotificationsList, markMessageAsSeen } from '../../../api/notifications';
import { useSocket } from '../../../hooks/use-socket.hook';
import { postUsageLog } from '../../../api/usage';
import { NotificationCenterContext } from '../../../store/notification-center.context';
import image from '../../../images/no-new-notifications.png';

export function Main() {
  const { socket } = useSocket();
  const { sendNotificationClick, sendUrlChange } = useContext(NotificationCenterContext);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const { isLoading, data, fetchNextPage, isFetchingNextPage, hasNextPage, isFetched, refetch, isFetching } =
    useInfiniteQuery<IMessage[]>('notifications-feed', async ({ pageParam = 0 }) => getNotificationsList(pageParam), {
      getNextPageParam: (lastPage) => {
        return lastPage.length === 10 ? currentPage + 1 : undefined;
      },
    });

  const { mutateAsync: markNotificationAsSeen } = useMutation<{ body: IMessage }, never, { messageId: string }>(
    (params) => markMessageAsSeen(params.messageId)
  );

  console.log({ socket });

  useEffect(() => {
    if (socket) {
      console.log('LISTENED TO EVENT');
      socket.on('unseen_count_changed', () => {
        console.log('COUNT CHANGED');
        refetch();
      });
    }

    return () => {
      if (socket) {
        socket.off('unseen_count_changed');
      }
    };
  }, [socket]);

  async function fetchNext() {
    if (isFetchingNextPage) return;
    fetchNextPage({
      pageParam: currentPage + 1,
    });
    setCurrentPage(currentPage + 1);
  }

  async function onNotificationClicked(notification: IMessage) {
    await markNotificationAsSeen({
      messageId: notification._id,
    });

    sendNotificationClick(notification);

    const hasCta = notification.cta?.type === ChannelCTATypeEnum.REDIRECT && notification.cta?.data?.url;

    postUsageLog('Notification Click', {
      notificationId: notification._id,
      hasCta,
    });

    if (hasCta && notification.cta?.data?.url) {
      sendUrlChange(notification.cta.data.url);
    }

    refetch();
  }

  return (
    <MainWrapper data-test-id="main-wrapper">
      {!isLoading && isFetched && !isFetching && data?.pages[0].length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            minHeight: 350,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <img src={image as any} alt="logo" style={{ maxWidth: 200 }} />
        </div>
      ) : (
        <NotificationsList
          onNotificationClicked={onNotificationClicked}
          notifications={data?.pages || []}
          onFetch={fetchNext}
          hasNextPage={!isFetched || (hasNextPage as boolean)}
        />
      )}
    </MainWrapper>
  );
}

const MainWrapper = styled.div``;
