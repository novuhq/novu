import { useContext } from 'react';

import { INotificationCenterContext } from '../shared/interfaces';
import { NotificationCenterContext } from '../store/notification-center.context';

export function useNotificationCenter(): INotificationCenterContext {
  const {
    onUrlChange,
    onNotificationClick,
    onActionClick,
    isLoading,
    header,
    footer,
    emptyState,
    listItem,
    actionsResultBlock,
    tabs,
    showUserPreferences,
    allowedNotificationActions,
    onTabClick,
    preferenceFilter,
  } = useContext(NotificationCenterContext);

  return {
    onUrlChange,
    onNotificationClick,
    onActionClick,
    isLoading,
    header,
    footer,
    emptyState,
    listItem,
    actionsResultBlock,
    tabs,
    showUserPreferences,
    allowedNotificationActions,
    onTabClick,
    preferenceFilter,
  };
}
