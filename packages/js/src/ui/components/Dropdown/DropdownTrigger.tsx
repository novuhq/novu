import { ComponentProps, splitProps } from 'solid-js';
import { useStyle } from '../../helpers';
import { AppearanceKey } from '../../context';
import { Popover } from '../Popover';

//TODO: Extend from buttonVariants() once added.
export const dropdownTriggerVariants = () =>
  'nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative hover:nt-bg-foreground-alpha-50 focus:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600 nt-px-2';

export const DropdownTrigger = (props: ComponentProps<typeof Popover.Trigger> & { appearanceKey?: AppearanceKey }) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey']);

  return (
    <Popover.Trigger class={style(local.appearanceKey || 'dropdownTrigger', dropdownTriggerVariants())} {...rest} />
  );
};
