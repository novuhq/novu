import { useNotifications } from '../../../hooks';
import React, { useContext, useEffect, useRef } from 'react';
import { NotificationCenterContext } from '../../../store/notification-center.context';
import { IMessage, ChannelCTATypeEnum } from '@novu/shared';
import image from '../../../images/no-new-notifications.png';
import { useApi } from '../../../hooks/use-api.hook';
import { NotificationsList } from './NotificationsList';
import { UnseenCountContext } from '../../../store/unseen-count.context';

export function NotificationsListTab({ feedId }: { feedId?: string | string[] }) {
  const { api } = useApi();
  const { onNotificationClick, onUrlChange } = useContext(NotificationCenterContext);
  const {
    markAsSeen: markNotificationAsSeen,
    fetchNextPage,
    refetch,
    notifications: data,
    fetching: isLoading,
    hasNextPage,
  } = useNotifications(feedId);

  const isFirstRender = useIsFirstRender();
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (!isNaN(unseenCount.count) && !isFirstRender) {
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
    <>
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
    </>
  );
}

export const useIsFirstRender = () => {
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    isFirstRenderRef.current = false;
  }, []);

  return isFirstRenderRef.current;
};
