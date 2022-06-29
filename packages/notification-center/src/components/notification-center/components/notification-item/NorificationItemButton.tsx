import React from 'react';
import { notificationItemButtons, ButtonType, IButtonStyles } from '../../../../shared/config/notificationItemButton';
import styled from 'styled-components';
import { Button } from '@mantine/core';

interface NotificationButtonProps {
  buttonContext: any;
}
export function NotificationButton(props: NotificationButtonProps) {
  const buttonType = props?.buttonContext?.type ? props.buttonContext.type : ButtonType.PRIMARY;

  const buttonText = props?.buttonContext?.content?.text ? props.buttonContext.content.text : '';
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
