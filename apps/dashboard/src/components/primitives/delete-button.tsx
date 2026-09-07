import { ComponentPropsWithoutRef } from 'react';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { IconButton, type IconButtonSize } from './icon-button';

type DeleteButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  size?: IconButtonSize;
  tooltip?: string;
};

export const DeleteButton = ({ tooltip = 'Delete', ...props }: DeleteButtonProps) => {
  return <IconButton icon={RiDeleteBin2Line} tooltip={tooltip} {...props} />;
};
