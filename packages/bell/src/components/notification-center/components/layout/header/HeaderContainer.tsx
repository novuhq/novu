import { useQuery } from 'react-query';
import { useContext, useEffect, useState } from 'react';
import { getUnseenCount } from '../../../../../api/notifications';
import { AuthContext } from '../../../../../store/auth.context';
import { useSocket } from '../../../../../hooks';
import React from 'react';
import { IAuthContext } from '../../../../../index';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { Header } from './Header';

export function HeaderContainer() {
  const [unseenCount, setUnseenCount] = useState<number>();
  const { socket } = useSocket();
  const { token } = useContext<IAuthContext>(AuthContext);
  const { onUnseenCountChanged, header } = useContext(NotificationCenterContext);
  const { data } = useQuery<{ count: number }>('unseenCount', getUnseenCount, {
    enabled: !!token,
  });

  useEffect(() => {
    if (socket) {
      socket.on('unseen_count_changed', (payload) => {
        setUnseenCount(payload.unseenCount);
      });
    }
  }, [socket]);

  useEffect(() => {
    if (onUnseenCountChanged) onUnseenCountChanged(unseenCount);
  }, [unseenCount, (window as any).parentIFrame]);

  useEffect(() => {
    if (data) {
      setUnseenCount(data?.count);
    }
  }, [data?.count]);

  function getHeader() {
    return header ? header({ unseenCount: unseenCount }) : <Header unseenCount={unseenCount} />;
  }

  return <>{getHeader()}</>;
}
