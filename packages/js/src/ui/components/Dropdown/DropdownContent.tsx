import { ComponentProps, splitProps } from 'solid-js';
import { AppearanceKey } from '../../context';
import { useStyle } from '../../helpers';
import { Popover } from '../Popover';

export const dropdownContentVariants = () =>
  'nt-w-max nt-rounded-lg nt-overflow-hidden nt-flex nt-flex-col nt-min-w-52 nt-shadow-[0_5px_20px_0_rgba(0,0,0,0.20)] nt-z-10 nt-bg-background';

export const DropdownContent = (props: ComponentProps<typeof Popover.Content> & { appearanceKey: AppearanceKey }) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey']);

  return (
    <Popover.Content class={style(local.appearanceKey || 'dropdownContent', dropdownContentVariants())} {...rest} />
  );
};
