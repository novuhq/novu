import { useContext, useEffect } from 'react';
import React from 'react';
import { Header } from './Header';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { UnseenCountContext } from '../../../../../store/unseen-count.context';
import { Screens } from '../Layout';

export function HeaderContainer({ setScreen }: { setScreen: (Screens) => void }) {
  const { onUnseenCountChanged, header } = useContext(NotificationCenterContext);
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount);
    }
  }, [unseenCount, (window as any).parentIFrame]);

  return header ? header() : <Header setScreen={setScreen} unseenCount={unseenCount} />;
}
