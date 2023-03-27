import React from 'react';
import { IMessage, ChannelCTATypeEnum } from '@novu/shared';

import { useNotifications, useNotificationCenter, useNovuContext } from '../../../hooks';
import image from '../../../images/no-new-notifications.png';
import { NotificationsList } from './NotificationsList';
import { Loader } from './Loader';

export function NotificationsListTab() {
  const { apiService } = useNovuContext();
  const { onNotificationClick, onUrlChange, emptyState } = useNotificationCenter();
  const { notifications, isLoading, hasNextPage, markNotificationAsRead, fetchNextPage } = useNotifications();

  async function fetchNext() {
    await fetchNextPage();
  }

  async function onNotificationClicked(notification: IMessage) {
    markNotificationAsRead(notification._id);

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    const hasCta = notification.cta?.type === ChannelCTATypeEnum.REDIRECT && notification.cta?.data?.url;

    apiService.postUsageLog('Notification Click', {
      notificationId: notification._id,
      hasCta,
    });

    if (hasCta && notification.cta?.data?.url && onUrlChange) {
      onUrlChange(notification.cta.data.url);
    }
  }

  return isLoading ? (
    <Loader />
  ) : (
    <>
      {!isLoading && notifications?.length === 0 ? (
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
          notifications={notifications || []}
          onFetch={fetchNext}
          hasNextPage={hasNextPage}
        />
      )}
    </>
  );
}
