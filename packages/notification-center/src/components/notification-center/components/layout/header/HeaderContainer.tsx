import React, { useContext, useEffect } from 'react';
import { Header } from './Header';
import { UnseenCountContext } from '../../../../../store';
import { useNotificationCenter } from '../../../../../hooks';

export function HeaderContainer() {
  const { onUnseenCountChanged, header } = useNotificationCenter();
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount);
    }
  }, [unseenCount, (window as any).parentIFrame]);

  return header ? header() : <Header unseenCount={unseenCount} />;
}
