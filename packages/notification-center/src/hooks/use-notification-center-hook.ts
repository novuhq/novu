import { useContext } from 'react';
import { NotificationCenterContext } from '../store/notification-center.context';

export function useNotificationCenter() {
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
