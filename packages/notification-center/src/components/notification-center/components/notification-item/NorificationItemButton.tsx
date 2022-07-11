import React from 'react';
import styled from 'styled-components';
import { IButtonStyles, ButtonTypeEnum, IMessageAction } from '@novu/shared';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Button } from '@mantine/core';

interface NotificationButtonProps {
  messageAction: IMessageAction;
  onActionButtonClick: (actionButtonType: ButtonTypeEnum) => void;
  buttonIndex: number;
}
export function NotificationButton(props: NotificationButtonProps) {
  const { theme } = useNovuThemeProvider();
  const button = props.messageAction.buttons[props.buttonIndex];
  const buttonStyle = theme.notificationItem.buttons[button.type];

  const buttonText = button?.content ? button.content : '';

  return (
    <>
      <ActionButton onClick={() => props.onActionButtonClick(button.type)} buttonStyle={buttonStyle}>
        {buttonText}
      </ActionButton>
    </>
  );
}

export const ActionButton = styled(MantineButton)<{ buttonStyle: IButtonStyles }>`
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
`;

export function MantineButton({ ...props }) {
  return <Button fullWidth {...props} />;
}
