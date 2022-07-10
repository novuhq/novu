import { useContext, useEffect } from 'react';
import React from 'react';
import { Header } from './Header';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { UnseenCountContext } from '../../../../../store/unseen-count.context';

export function HeaderContainer() {
  const { onUnseenCountChanged, header } = useContext(NotificationCenterContext);
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount.count);
    }
  }, [unseenCount.count, (window as any).parentIFrame]);

  function getHeader() {
    return header ? header() : <Header unseenCount={unseenCount.count} />;
  }

  return <>{getHeader()}</>;
}
