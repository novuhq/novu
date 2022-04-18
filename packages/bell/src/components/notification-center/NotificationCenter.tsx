import React, { useContext, useState } from 'react';
import { App } from './components/App';
import { IMessage } from '@novu/shared';
import { useClickOutside } from '@mantine/hooks';
import { NotificationCenterContext } from '../../store/notification-center.context';
import styled from 'styled-components';
import { Popper } from '@mantine/core';
import { NovuContext } from '../../store/novu-provider.context';
import { colors } from '../../shared/config/colors';

interface INotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  showWidget?: boolean;
  bell: JSX.Element | Element;
}

export function NotificationCenter(props: INotificationCenterProps) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const clickOutsideRef = useClickOutside(() => setIsVisible(false));
  const { colorScheme, applicationIdentifier } = useContext(NovuContext);

  function handlerBellClick() {
    setIsVisible(!isVisible);
  }

  return (
    <>
      <NotificationCenterContext.Provider
        value={{
          sendUrlChange: props.onUrlChange,
          sendNotificationClick: props.onNotificationClick,
          onUnseenCountChanged: props.onUnseenCountChanged,
          isLoading: !applicationIdentifier,
        }}>
        <Wrap ref={clickOutsideRef}>
          <BellContainer onClick={handlerBellClick} ref={setReferenceElement}>
            {props.bell}
          </BellContainer>

          <Popper
            arrowStyle={{
              backgroundColor: colorScheme === 'dark' ? colors.B15 : colors.white,
            }}
            placement={'end'}
            arrowSize={5}
            withArrow
            position={'bottom'}
            referenceElement={referenceElement}
            mounted={isVisible}>
            <App />
          </Popper>
        </Wrap>
      </NotificationCenterContext.Provider>
    </>
  );
}

const Wrap = styled.div``;

const BellContainer = styled.span``;
