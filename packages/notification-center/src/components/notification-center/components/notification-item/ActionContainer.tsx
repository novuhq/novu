import React, { useEffect, useState } from 'react';
import { NotificationButton } from './NorificationItemButton';
import { IMessageAction, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import styled from 'styled-components';

export interface IActionContainerProps {
  action?: IMessageAction;
  onActionClick: (actionButtonType: ButtonTypeEnum) => void;
}

export function ActionContainer({ action, onActionClick }: IActionContainerProps) {
  const [clicked, setClicked] = useState<boolean>(action.status === MessageActionStatusEnum.DONE);
  const buttons = action?.buttons;

  useEffect(() => {
    if (action?.status) {
      setClicked(action?.status === MessageActionStatusEnum.DONE);
    }
  }, [action.status]);

  function handleOnClick(buttonType: ButtonTypeEnum) {
    onActionClick(buttonType);
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
