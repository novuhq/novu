import React from 'react';
import styled from 'styled-components';
import { IButtonStyles, IMessageButton, ButtonTypeEnum } from '@novu/shared';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Button } from '@mantine/core';

interface NotificationButtonProps {
  buttonContext: IMessageButton;
  onNotificationClick: (actionButtonType: ButtonTypeEnum) => void;
}
export function NotificationButton(props: NotificationButtonProps) {
  const { theme } = useNovuThemeProvider();
  const buttonStyle = theme.notificationItem.buttons[props.buttonContext.type];

  const buttonText = props?.buttonContext?.content ? props.buttonContext.content : '';

  return (
    <>
      <StyledButton onClick={() => props.onNotificationClick(props.buttonContext.type)} buttonStyle={buttonStyle}>
        {buttonText}
      </StyledButton>
    </>
  );
}

const StyledButton = styled(MantineButton)<{ buttonStyle: IButtonStyles }>`
  background: ${({ buttonStyle }) => buttonStyle.backGroundColor};
  color: ${({ buttonStyle }) => buttonStyle.fontColor};
  box-shadow: none;
  display: flex;
  justify-content: center;
  margin-left: 5px;
  margin-right: 5px;
`;

export function MantineButton({ ...props }) {
  return <Button fullWidth {...props} />;
}
