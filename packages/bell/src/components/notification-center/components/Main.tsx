import React, { useContext, useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation } from 'react-query';
import { ChannelCTATypeEnum, IMessage } from '@novu/shared';
import styled from 'styled-components';
import { NotificationsList } from './NotificationsList';
import { NotificationCenterContext } from '../../../store/notification-center.context';
import image from '../../../images/no-new-notifications.png';
import { UnseenCountContext } from '../../../store/unseen-count.context';
import { useApi } from '../../../hooks/use-api';

export function Main() {
  const { api } = useApi();
  const { sendNotificationClick, sendUrlChange } = useContext(NotificationCenterContext);
  const { unseenCount } = useContext(UnseenCountContext);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const { isLoading, data, fetchNextPage, isFetchingNextPage, hasNextPage, isFetched, refetch, isFetching } =
    useInfiniteQuery<IMessage[]>(
      'notifications-feed',
      async ({ pageParam = 0 }) => api.getNotificationsList(pageParam),
      {
        getNextPageParam: (lastPage) => {
          return lastPage.length === 10 ? currentPage + 1 : undefined;
        },
      }
    );

  const { mutateAsync: markNotificationAsSeen } = useMutation<{ body: IMessage }, never, { messageId: string }>(
    (params) => api.markMessageAsSeen(params.messageId)
  );

  useEffect(() => {
    if (!isNaN(unseenCount)) {
      refetch();
    }
  }, [unseenCount]);

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

    if (sendNotificationClick) {
      sendNotificationClick(notification);
    }
    const hasCta = notification.cta?.type === ChannelCTATypeEnum.REDIRECT && notification.cta?.data?.url;

    api.postUsageLog('Notification Click', {
      notificationId: notification._id,
      hasCta,
    });

    if (hasCta && notification.cta?.data?.url && sendUrlChange) {
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
          }}
        >
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
