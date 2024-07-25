import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { AppearanceKey } from '../../../context';
import { useStyle } from '../../../helpers';
import { Popover, usePopover } from '../Popover';

export const dropdownItemVariants = () =>
  'focus:nt-outline-none nt-items-center hover:nt-bg-neutral-alpha-50 focus-visible:nt-bg-neutral-alpha-50 nt-py-1 nt-px-3';

type DropdownItemProps = JSX.IntrinsicElements['button'] & { appearanceKey?: AppearanceKey };
export const DropdownItem = (props: DropdownItemProps) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey', 'onClick']);
  const { onClose } = usePopover();

  return (
    <Popover.Close
      class={style(local.appearanceKey || 'dropdownItem', dropdownItemVariants())}
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
