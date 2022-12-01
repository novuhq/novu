import React from 'react';
import { Button, ButtonProps } from '@mantine/core';
import styled from 'styled-components';
import { IButtonStyles, ButtonTypeEnum, IMessageAction } from '@novu/shared';
import { useNovuTheme } from '../../../../hooks';

interface NotificationButtonProps {
  messageAction: IMessageAction;
  onActionClick: (actionButtonType: ButtonTypeEnum) => void;
  buttonIndex: number;
}
export function NotificationButton(props: NotificationButtonProps) {
  const { theme } = useNovuTheme();
  const button = props.messageAction.buttons[props.buttonIndex];
  const buttonStyle = theme.notificationItem.buttons[button.type];

  const buttonText = button?.content ? button.content : '';

  function handleOnclick(e) {
    e.stopPropagation();
    props.onActionClick(button.type);
  }

  return (
    <>
      <ActionButton onClick={(e) => handleOnclick(e)} buttonStyle={buttonStyle}>
        {buttonText}
      </ActionButton>
    </>
  );
}

export const ActionButton = styled<ButtonProps>(Button).attrs((props) => ({ fullWidth: true, ...props }))`
  background: ${({ buttonStyle }) => buttonStyle.backGroundColor};
  color: ${({ buttonStyle }) => buttonStyle.fontColor};
  font-family: ${({ buttonStyle }) => buttonStyle.fontFamily};
  box-shadow: none;
  display: flex;
  justify-content: center;
  margin-left: 5px;
  margin-right: 5px;
  height: 30px;
  font-weight: 700;
  font-size: 12px;
  border-radius: 7px;
  border: 0;

  &:hover {
    background: ${({ buttonStyle }) => buttonStyle.backGroundColor};
  }
`;
