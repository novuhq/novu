import React, { useContext, useEffect } from 'react';
import { Header } from './Header';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { UnseenCountContext } from '../../../../../store/unseen-count.context';
import { ScreensEnum } from '../Layout';

export function HeaderContainer({ setScreen }: { setScreen: (screen: ScreensEnum) => void }) {
  const { onUnseenCountChanged, header } = useContext(NotificationCenterContext);
  const { unseenCount } = useContext(UnseenCountContext);

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount);
    }
  }, [unseenCount, (window as any).parentIFrame]);

  return header ? header() : <Header setScreen={setScreen} unseenCount={unseenCount} />;
}
