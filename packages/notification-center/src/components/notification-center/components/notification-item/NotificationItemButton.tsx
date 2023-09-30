import React from 'react';
import { Button } from '@mantine/core';
import { css, cx } from '@emotion/css';
import { IButtonStyles, ButtonTypeEnum, IMessageAction } from '@novu/shared';

import { useNovuTheme } from '../../../../hooks';

interface NotificationButtonProps {
  messageAction: IMessageAction;
  onActionClick: (actionButtonType: ButtonTypeEnum) => void;
  buttonIndex: number;
  className?: string;
}
export function NotificationButton({ className, messageAction, buttonIndex, onActionClick }: NotificationButtonProps) {
  const { theme } = useNovuTheme();
  const button = messageAction.buttons[buttonIndex];
  const buttonStyle = theme.notificationItem.buttons[button.type];
  const buttonText = button?.content ? button.content : '';

  function handleOnclick(e) {
    e.stopPropagation();
    onActionClick(button.type);
  }

  return (
    <>
      <Button onClick={(e) => handleOnclick(e)} className={cx(actionButtonStyles(buttonStyle), className)} fullWidth>
        {buttonText}
      </Button>
    </>
  );
}

export const actionButtonStyles = (buttonStyle: IButtonStyles) => css`
  background: ${buttonStyle.backGroundColor};
  color: ${buttonStyle.fontColor};
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
    background: ${buttonStyle.backGroundColor};
  }
`;
