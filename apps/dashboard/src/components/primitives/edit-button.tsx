import { ComponentPropsWithoutRef } from 'react';
import { RiEdit2Line } from 'react-icons/ri';
import { IconButton, type IconButtonSize } from './icon-button';

type EditButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  size?: IconButtonSize;
  tooltip?: string;
};

export const EditButton = ({ tooltip = 'Edit', ...props }: EditButtonProps) => {
  return <IconButton icon={RiEdit2Line} tooltip={tooltip} {...props} />;
};
