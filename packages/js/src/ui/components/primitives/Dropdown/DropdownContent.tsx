import { ComponentProps, splitProps } from 'solid-js';
import { useStyle } from '../../../helpers';
import type { AppearanceKey } from '../../../types';
import { Popover } from '../Popover';

export const dropdownContentVariants = () =>
  'nt-w-max nt-rounded-xl nt-p-1 nt-overflow-hidden nt-flex nt-flex-col nt-min-w-52 nt-shadow-dropdown nt-z-10 nt-bg-background';

export const DropdownContent = (props: ComponentProps<typeof Popover.Content> & { appearanceKey?: AppearanceKey }) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey']);

  return (
    <Popover.Content class={style(local.appearanceKey || 'dropdownContent', dropdownContentVariants())} {...rest} />
  );
};
