import React, { useEffect } from 'react';
import { Header } from './Header';
import { useNotificationCenter, useUnseenCount } from '../../../../../hooks';

export function HeaderContainer() {
  const { onUnseenCountChanged, header } = useNotificationCenter();
  const { unseenCount } = useUnseenCount();

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount);
    }
  }, [unseenCount, (window as any).parentIFrame]);

  return header ? header() : <Header unseenCount={unseenCount} />;
}
