import React from 'react';
import styled from 'styled-components';
import { Button } from '@mantine/core';
import { ButtonTypeEnum, notificationItemButtons, IButtonStyles, IMessageButton } from '@novu/shared';

interface NotificationButtonProps {
  buttonContext: IMessageButton;
}
export function NotificationButton(props: NotificationButtonProps) {
  const buttonType = props?.buttonContext?.type ? props.buttonContext.type : ButtonTypeEnum.PRIMARY;

  const buttonText = props?.buttonContext?.content ? props.buttonContext.content : '';
  const buttonStyles = notificationItemButtons.find((button) => button.key === buttonType)?.value;

  return (
    <>
      <StyledButton styles={buttonStyles}>{buttonText}</StyledButton>
    </>
  );
}

const StyledButton = styled(MantineButton)<{ styles: IButtonStyles }>`
  color: ${({ styles }) => styles.color};
`;

export function MantineButton({ ...props }) {
  return <Button {...props} />;
}
