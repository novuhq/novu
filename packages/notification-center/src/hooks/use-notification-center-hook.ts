import { useContext } from 'react';
import { NotificationCenterContext } from '../store';

export function useNotificationCenter() {
  const {
    onUrlChange,
    onNotificationClick,
    onUnseenCountChanged,
    onActionClick,
    isLoading,
    header,
    footer,
    listItem,
    actionsResultBlock,
    tabs,
    showUserPreferences,
  } = useContext(NotificationCenterContext);

  return {
    onUrlChange,
    onNotificationClick,
    onUnseenCountChanged,
    onActionClick,
    isLoading,
    header,
    footer,
    listItem,
    actionsResultBlock,
    tabs,
    showUserPreferences,
  };
}
