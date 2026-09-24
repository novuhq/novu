import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { callButtonHandler } from '../asChild';
import { Popover, usePopover } from '../Popover';

// The highlight appears at once and fades out, so moving through a menu leaves a short trail instead of flicker.
export const dropdownItemVariants = () =>
  'focus:nt-outline-none nt-flex nt-items-center nt-gap-1.5 nt-text-sm nt-rounded-lg nt-items-center hover:nt-bg-neutral-alpha-50 focus-visible:nt-bg-neutral-alpha-50 nt-py-1 nt-px-2 nt-transition-colors nt-duration-fast hover:nt-duration-0 focus-visible:nt-duration-0';

type DropdownItemProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AllAppearanceKey;
  asChild?: (
    props: Omit<JSX.IntrinsicElements['button'], 'onClick'> & { onClick: (e: MouseEvent) => void }
  ) => JSX.Element;
};
export const DropdownItem = (props: DropdownItemProps) => {
  const [local, rest] = splitProps(props, ['appearanceKey', 'onClick', 'class', 'asChild']);
  const { onClose } = usePopover();

  const handleClick = (e: MouseEvent) => {
    callButtonHandler(local.onClick, e);
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
      }}
      {...rest}
    />
  );
};
