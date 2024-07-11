import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { AppearanceKey } from '../../context';
import { useStyle } from '../../helpers';

export const dropdownItemVariants = () =>
  'focus:nt-outline-none nt-items-center hover:nt-bg-neutral-alpha-100 nt-py-1 nt-px-3';

type DropdownItemProps = JSX.IntrinsicElements['button'] & { appearanceKey?: AppearanceKey };
export const DropdownItem = (props: DropdownItemProps) => {
  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey']);

  return <button class={style(local.appearanceKey || 'dropdownItem', dropdownItemVariants())} {...rest} />;
};
