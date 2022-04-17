import React, { useContext, useEffect, useState } from 'react';
import { IMessage } from '@novu/shared';
import styled from 'styled-components';
import { Popover } from '@mantine/core';
import { NotificationCenter } from '../notification-center';
import { NovuContext } from '../../store/novu-provider.context';
import { colors } from '../../shared/config/colors';
import { getUnseenCount } from '../../api/notifications';
import { INotificationBellProps } from '../notification-bell';

interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  children: (props: INotificationBellProps) => JSX.Element;
  unseenCount: number;
}

export function PopoverNotificationCenter({ children, ...props }: IPopoverNotificationCenterProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { colorScheme } = useContext(NovuContext);

  const { unseenCount } = props;

  useEffect(() => {
    (async () => {
      if (props.onUnseenCountChanged) {
        props.onUnseenCountChanged((await getUnseenCount()).count);
      }
    })();
  }, []);

  function handlerOnUnseenCount(count: number) {
    if (isNaN(count)) return;
    if (props.onUnseenCountChanged) {
      props.onUnseenCountChanged(count);
    }
  }

  function handlerBellClick() {
    setIsVisible(!isVisible);
  }

  return (
    <Popover
      opened={isVisible}
      onClose={() => setIsVisible(false)}
      target={<BellContainer onClick={handlerBellClick}> {children({ unseenCount })}</BellContainer>}
      position={'bottom'}
      placement={'end'}
      styles={{
        inner: { margin: 0, padding: 0 },
        body: { border: 0 },
        popover: { background: `${colorScheme === 'dark' ? colors.B15 : colors.white}` },
        arrow: {
          background: `${colorScheme === 'dark' ? colors.B15 : colors.white}`,
          backgroundColor: `${colorScheme === 'dark' ? colors.B15 : colors.white}`,
          borderColor: `${colorScheme === 'dark' ? colors.B15 : colors.white}`,
        },
      }}
      withArrow>
      <NotificationCenter
        onNotificationClick={props.onNotificationClick}
        onUnseenCountChanged={handlerOnUnseenCount}
        onUrlChange={props.onUrlChange}
      />
    </Popover>
  );
}

const BellContainer = styled.span``;
