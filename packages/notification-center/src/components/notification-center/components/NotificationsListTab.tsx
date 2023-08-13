import React from 'react';
import { IMessage, ChannelCTATypeEnum } from '@novu/shared';

import { useNotifications, useNotificationCenter, useNovuContext, useTranslations } from '../../../hooks';
import { NotificationsList } from './NotificationsList';
import { Loader } from './Loader';
import { colors } from '../../../shared/config/colors';
import { NoNewNotifications } from '../../../images/NoNewNotifications';

export function NotificationsListTab() {
  const { apiService } = useNovuContext();
  const { onNotificationClick, onUrlChange, emptyState } = useNotificationCenter();
  const { notifications, isLoading, hasNextPage, markNotificationAsRead, fetchNextPage } = useNotifications();
  const { t } = useTranslations();

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
                flexDirection: 'column',
                minHeight: 350,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <NoNewNotifications style={{ maxWidth: 200, marginBottom: 15 }} />
              <span style={{ color: colors.B70, fontSize: 15 }}>{t('noNewNotification')}</span>
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
