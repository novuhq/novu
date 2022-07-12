import React, { useContext, useEffect, useRef } from 'react';
import { ChannelCTATypeEnum, IMessage } from '@novu/shared';
import styled from 'styled-components';
import { NotificationsList } from './NotificationsList';
import { NotificationCenterContext } from '../../../store/notification-center.context';
import image from '../../../images/no-new-notifications.png';
import { UnseenCountContext } from '../../../store/unseen-count.context';
import { useApi } from '../../../hooks/use-api.hook';
import { useNotifications } from '../../../hooks';

export function Main() {
  const { api } = useApi();
  const { onNotificationClick, onUrlChange } = useContext(NotificationCenterContext);
  const {
    markAsSeen: markNotificationAsSeen,
    fetchNextPage,
    refetch,
    notifications: data,
    fetching: isLoading,
    hasNextPage,
  } = useNotifications();
  const isFirstRender = useIsFirstRender();
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (!isNaN(unseenCount) && !isFirstRender) {
      refetch();
    }
  }, [unseenCount]);

  async function fetchNext() {
    await fetchNextPage();
  }

  async function onNotificationClicked(notification: IMessage) {
    await markNotificationAsSeen(notification._id);

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    const hasCta = notification.cta?.type === ChannelCTATypeEnum.REDIRECT && notification.cta?.data?.url;

    api.postUsageLog('Notification Click', {
      notificationId: notification._id,
      hasCta,
    });

    if (hasCta && notification.cta?.data?.url && onUrlChange) {
      onUrlChange(notification.cta.data.url);
    }

    refetch();
  }

  return (
    <MainWrapper data-test-id="main-wrapper">
      {!isLoading && data?.length === 0 ? (
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
          notifications={data || []}
          onFetch={fetchNext}
          hasNextPage={hasNextPage}
        />
      )}
    </MainWrapper>
  );
}

const MainWrapper = styled.div``;

export const useIsFirstRender = () => {
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    isFirstRenderRef.current = false;
  }, []);

  return isFirstRenderRef.current;
};
