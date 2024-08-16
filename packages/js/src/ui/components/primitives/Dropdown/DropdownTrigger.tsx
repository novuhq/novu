import { ComponentProps, splitProps } from 'solid-js';
import type { AppearanceKey } from '../../../types';
import { useStyle } from '../../../helpers';
import { Popover } from '../Popover';

export const dropdownTriggerButtonVariants = () =>
  `nt-relative nt-transition nt-outline-none focus-visible:nt-outline-none` +
  `focus-visible:nt-ring-2 focus-visible:nt-ring-primary focus-visible:nt-ring-offset-2`;

export const DropdownTrigger = (props: ComponentProps<typeof Popover.Trigger> & { appearanceKey?: AppearanceKey }) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey']);

  return (
    <Popover.Trigger
      class={style(local.appearanceKey || 'dropdownTrigger', dropdownTriggerButtonVariants())}
      {...rest}
    />
  );
};
