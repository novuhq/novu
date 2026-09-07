import { ComponentPropsWithoutRef } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { IconButton, type IconButtonSize } from './icon-button';

type AddButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  size?: IconButtonSize;
  tooltip?: string;
};

export const AddButton = ({ tooltip = 'Add', ...props }: AddButtonProps) => {
  return <IconButton icon={RiAddLine} tooltip={tooltip} {...props} />;
};
