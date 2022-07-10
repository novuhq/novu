import React from 'react';
import { ActionButton, NotificationButton } from './NorificationItemButton';
import { IMessageAction, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import styled from 'styled-components';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';

export interface IActionContainerProps {
  action?: IMessageAction;
  onActionButtonClick: (actionButtonType: ButtonTypeEnum) => void;
}

export function ActionContainer(props: IActionContainerProps) {
  const { theme } = useNovuThemeProvider();
  const buttons = props?.action?.buttons;
  const buttonStyle = theme.notificationItem.buttons[ButtonTypeEnum.CLICKED];

  const clicked = props.action.status === MessageActionStatusEnum.DONE;

  return (
    <>
      <TemplateContainerWrap>
        <TemplateContainer>
          {clicked ? (
            <ActionButton clicked={clicked.toString()} buttonStyle={buttonStyle}>
              Clicked
            </ActionButton>
          ) : (
            buttons?.map((button, buttonIndex) => (
              <NotificationButton
                onActionButtonClick={props.onActionButtonClick}
                messageAction={props?.action}
                buttonIndex={buttonIndex}
                key={button.type}
              />
            ))
          )}
        </TemplateContainer>
      </TemplateContainerWrap>
    </>
  );
}

const TemplateContainerWrap = styled.div`
  margin-left: 10px;
  margin-right: 10px;
`;

const TemplateContainer = styled.div`
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  max-height: 50px;
  margin-left: -15px;
  margin-right: -15px;
`;
