import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from 'react-query';
import { ChannelCTATypeEnum, IMessage } from '@novu/shared';
import styled from 'styled-components';
import { NotificationsList } from './components/NotificationsList';
import { getNotificationsList, markMessageAsSeen } from './api/notifications';
import { useSocket } from './hooks/use-socket.hook';
import { sendNotificationClick, sendUrlChange } from './api/sdk.service';
import { postUsageLog } from './api/usage';

export function Main() {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isFetched, refetch, isFetching } = useInfiniteQuery<
    IMessage[]
  >('notifications-feed', async ({ pageParam = 0 }) => getNotificationsList(pageParam), {
    getNextPageParam: (lastPage) => {
      return lastPage.length === 10 ? currentPage + 1 : undefined;
    },
  });
  const { mutateAsync: markNotificationAsSeen } = useMutation<{ body: IMessage }, never, { messageId: string }>(
    (params) => markMessageAsSeen(params.messageId)
  );
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('unseen_count_changed', () => {
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
      <NotificationsList
        onNotificationClicked={onNotificationClicked}
        notifications={data?.pages || []}
        onFetch={fetchNext}
        hasNextPage={!isFetched || (hasNextPage as boolean)}
      />
    </MainWrapper>
  );
}

const MainWrapper = styled.div`
  background: ${({ theme }) => theme.colors.contentBackground};
`;
