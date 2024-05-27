import { EventHandler, FC, MouseEventHandler } from 'react';
import { Button as ExternalButton } from '@mantine/core';

interface IButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const Button: FC<IButtonProps> = ({ onClick }) => {
  return <ExternalButton onClick={onClick}>Test</ExternalButton>;
};
