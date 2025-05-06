import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../../helpers';
import type { AppearanceKey } from '../../../types';
import { Popover, usePopover } from '../Popover';

export const dropdownItemVariants = () =>
  'focus:nt-outline-none nt-flex nt-items-center nt-gap-1.5 nt-text-sm nt-rounded-lg nt-items-center hover:nt-bg-neutral-alpha-50 focus-visible:nt-bg-neutral-alpha-50 nt-py-1 nt-px-2';

type DropdownItemProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AppearanceKey;
  asChild?: (props: any) => JSX.Element;
};
export const DropdownItem = (props: DropdownItemProps) => {
  const [local, rest] = splitProps(props, ['appearanceKey', 'onClick', 'class', 'asChild']);
  const { onClose } = usePopover();

  const handleClick = (e: MouseEvent) => {
    if (typeof local.onClick === 'function') {
      local.onClick(e as any);
    }
    onClose();
  };

  if (local.asChild) {
    return <Dynamic component={local.asChild} onClick={handleClick} {...rest} />;
  }

  return (
    <Popover.Close
      appearanceKey={local.appearanceKey || 'dropdownItem'}
      class={cn(dropdownItemVariants(), local.class)}
      onClick={(e) => {
        if (typeof local.onClick === 'function') {
          local.onClick(e);
        }
        onClose();
      }}
      {...rest}
    />
  );
};
