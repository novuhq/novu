import { useContext, useEffect } from 'react';
import React from 'react';
import { Header } from './Header';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { UnseenCountContext } from '../../../../../store/unseen-count.context';

export function HeaderContainer({ setShowSettings }: { setShowSettings: (boolean) => void }) {
  const { onUnseenCountChanged, header } = useContext(NotificationCenterContext);
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount);
    }
  }, [unseenCount, (window as any).parentIFrame]);

  return header ? header() : <Header setShowSettings={setShowSettings} unseenCount={unseenCount} />;
}
