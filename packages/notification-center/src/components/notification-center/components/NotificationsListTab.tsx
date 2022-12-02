import React, { useEffect } from 'react';
import { IMessage, ChannelCTATypeEnum } from '@novu/shared';
import { useNotifications, useApi, useNotificationCenter, useUnseenCount } from '../../../hooks';
import image from '../../../images/no-new-notifications.png';
import { NotificationsList } from './NotificationsList';
import { ITab } from '../../../shared/interfaces';

export function NotificationsListTab({ tab }: { tab?: ITab }) {
  const { api } = useApi();
  const { onNotificationClick, onUrlChange, emptyState } = useNotificationCenter();

  const storeId = tab?.storeId || 'default_store';
  const {
    markAsRead: markNotificationAsRead,
    fetchNextPage,
    refetch,
    notifications: data,
    fetching: isLoading,
    hasNextPage,
  } = useNotifications({ storeId: storeId });

  const { unseenCount } = useUnseenCount();

  useEffect(() => {
    if (!isNaN(unseenCount)) {
      refetch();
    }
  }, [unseenCount]);

  useEffect(() => {
    if (!data) {
      refetch();
    }
  }, []);

  async function fetchNext() {
    await fetchNextPage();
  }

  async function onNotificationClicked(notification: IMessage) {
    markNotificationAsRead(notification._id);

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
  }

  return (
    <>
      {!isLoading && data?.length === 0 ? (
        <>
          {emptyState ? (
            emptyState
          ) : (
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
          )}
        </>
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
