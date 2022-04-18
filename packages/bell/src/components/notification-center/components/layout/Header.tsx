import styled, { useTheme } from 'styled-components';
import { useQuery } from 'react-query';
import { Badge } from '@mantine/core';
import { useContext, useEffect, useState } from 'react';
import { getUnseenCount } from '../../../../api/notifications';
import { AuthContext } from '../../../../store/auth.context';
import { useSocket } from '../../../../hooks/use-socket.hook';
import { colors } from '../../../../shared/config/colors';
import React from 'react';
import { IAuthContext } from '../../../../index';
import { NotificationCenterContext } from '../../../../store/notification-center.context';

export function Header() {
  const theme: any = useTheme();
  const [unseenCount, setUnseenCount] = useState<number>();
  const { socket } = useSocket();
  const { token } = useContext<IAuthContext>(AuthContext);
  const { onUnseenCountChanged } = useContext(NotificationCenterContext);
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

  return (
    <HeaderWrapper>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <Text>Notifications </Text>
        {unseenCount && unseenCount > 0 ? (
          <Badge
            data-test-id="unseen-count-label"
            sx={{
              padding: 0,
              width: 20,
              height: 20,
              pointerEvents: 'none',
              border: 'none',
              background: theme.colors.main,
              fontFamily: theme.fontFamily,
              lineHeight: '14px',
              color: colors.white,
              fontWeight: 'bold',
              fontSize: '12px',
            }}
            radius={100}
          >
            {unseenCount}
          </Badge>
        ) : null}
      </div>
      <MarkReadAction style={{ display: 'none' }}>Mark all as read</MarkReadAction>
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.div`
  padding: 5px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 55px;
`;

const Text = styled.div`
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
`;
const MarkReadAction = styled.div`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 17px;
  color: ${colors.B60};
`;
