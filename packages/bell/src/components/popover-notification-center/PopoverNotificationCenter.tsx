import React, { useContext, useState } from 'react';
import { IMessage } from '@novu/shared';
import styled from 'styled-components';
import { Popover } from '@mantine/core';
import { NotificationCenter } from '../notification-center';
import { NovuContext } from '../../store/novu-provider.context';
import { colors } from '../../shared/config/colors';

interface IPopoverNotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  bell: JSX.Element | Element;
}

export function PopoverNotificationCenter(props: IPopoverNotificationCenterProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const { colorScheme } = useContext(NovuContext);

  function handlerBellClick() {
    setIsVisible(!isVisible);
  }

  return (
    <>
      <StyledPopover
        opened={isVisible}
        onClose={() => setIsVisible(false)}
        target={<BellContainer onClick={handlerBellClick}>{props.bell}</BellContainer>}
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
          onUnseenCountChanged={props.onUnseenCountChanged}
          onUrlChange={props.onUrlChange}
          bell={props.bell}
        />
      </StyledPopover>
    </>
  );
}

const BellContainer = styled.span``;
