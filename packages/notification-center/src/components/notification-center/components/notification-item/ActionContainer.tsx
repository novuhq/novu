import React, { useState } from 'react';
import { NotificationButton } from './NorificationItemButton';
import { IMessageAction, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import styled from 'styled-components';

export interface IActionContainerProps {
  action?: IMessageAction;
  onActionButtonClick: (actionButtonType: ButtonTypeEnum) => void;
}

export function ActionContainer(props: IActionContainerProps) {
  const [clicked, setClicked] = useState<boolean>(props.action.status === MessageActionStatusEnum.DONE);
  const buttons = props?.action?.buttons;

  function handleOnClick(buttonType: ButtonTypeEnum) {
    props.onActionButtonClick(buttonType);
    setClicked(true);
  }

  return (
    <>
      <TemplateContainerWrap>
        <TemplateContainer>
          {clicked
            ? null
            : buttons?.map((button, buttonIndex) => (
                <NotificationButton
                  onActionButtonClick={(buttonType) => handleOnClick(buttonType)}
                  messageAction={props?.action}
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
