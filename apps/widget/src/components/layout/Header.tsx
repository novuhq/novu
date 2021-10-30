import styled from 'styled-components';
import { BellOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';
import { Badge } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { getUnseenCount } from '../../api/notifications';
import { AuthContext, IAuthContext } from '../../store/auth.context';
import { useSocket } from '../../hooks/use-socket.hook';

export function Header() {
  const [unseenCount, setUnseenCount] = useState<number>();
  const { socket } = useSocket();
  const { token } = useContext<IAuthContext>(AuthContext);
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
    if ('parentIFrame' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).parentIFrame.sendMessage({
        type: 'unseen_count_changed',
        count: unseenCount,
      });
    }
  }, [unseenCount]);

  useEffect(() => {
    if (data) {
      setUnseenCount(data?.count);
    }
  }, [data?.count]);

  return (
    <HeaderWrapper>
      <Badge data-test-id="unseen-count-label" count={unseenCount} size="small" offset={[0, -1]}>
        <BellOutlined style={{ fontSize: 18 }} />
      </Badge>
      <Text>Notifications </Text>
      <span />
      {/* <SettingOutlined /> */}
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.div`
  border-bottom: 1px solid #edf2f9;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Text = styled.div`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 22px;
  text-align: center;
`;
