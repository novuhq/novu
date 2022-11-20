import React from 'react';
import { NotificationButton } from './NotificationItemButton';
import { IMessageAction, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import styled from 'styled-components';

export interface IActionContainerProps {
  action?: IMessageAction;
  onActionClick: (actionButtonType: ButtonTypeEnum) => void;
}

export function ActionContainer({ action, onActionClick }: IActionContainerProps) {
  const status = action?.status;
  const buttons = action?.buttons;

  function handleOnClick(buttonType: ButtonTypeEnum) {
    onActionClick(buttonType);
  }

  return (
    <>
      <TemplateContainerWrap>
        <TemplateContainer>
          {status === MessageActionStatusEnum.DONE
            ? null
            : buttons?.map((button, buttonIndex) => (
                <NotificationButton
                  onActionClick={(buttonType) => handleOnClick(buttonType)}
                  messageAction={action}
                  buttonIndex={buttonIndex}
                  key={button.type}
                />
              ))}
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
