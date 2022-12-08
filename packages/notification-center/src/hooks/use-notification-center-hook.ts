import { useContext } from 'react';

import { INotificationCenterContext } from '../shared/interfaces';
import { NotificationCenterContext } from '../store/notification-center.context';

export function useNotificationCenter(): INotificationCenterContext {
  const {
    onUrlChange,
    onNotificationClick,
    onUnseenCountChanged,
    onActionClick,
    isLoading,
    header,
    footer,
    emptyState,
    listItem,
    actionsResultBlock,
    tabs,
    showUserPreferences,
    onTabClick,
  } = useContext(NotificationCenterContext);

  return {
    onUrlChange,
    onNotificationClick,
    onUnseenCountChanged,
    onActionClick,
    isLoading,
    header,
    footer,
    emptyState,
    listItem,
    actionsResultBlock,
    tabs,
    showUserPreferences,
    onTabClick,
  };
}
