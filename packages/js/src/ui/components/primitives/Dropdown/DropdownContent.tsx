import { ComponentProps, splitProps } from 'solid-js';
import { cn } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { Popover } from '../Popover';

export const dropdownContentVariants = () =>
  'nt-p-1 nt-text-sm nt-min-w-52 nt-shadow-dropdown nt-h-fit nt-min-w-52 nt-w-max';

export const DropdownContent = (
  props: ComponentProps<typeof Popover.Content> & { appearanceKey?: AllAppearanceKey }
) => {
  const [local, rest] = splitProps(props, ['appearanceKey', 'class']);

  return (
    <Popover.Content
      appearanceKey={local.appearanceKey || 'dropdownContent'}
      class={cn(dropdownContentVariants(), local.class)}
      {...rest}
    />
  );
};
