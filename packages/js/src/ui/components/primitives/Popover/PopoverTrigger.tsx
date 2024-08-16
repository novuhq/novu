import { JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { usePopover } from '.';
import type { AppearanceKey } from '../../../types';
import { useStyle } from '../../../helpers';

type PopoverTriggerProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AppearanceKey;
  asChild?: (props: any) => JSX.Element;
};
export const PopoverTrigger = (props: PopoverTriggerProps) => {
  const { setReference, onToggle } = usePopover();

  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey', 'asChild', 'onClick']);

  const handleClick = (e: MouseEvent) => {
    if (typeof local.onClick === 'function') {
      local.onClick(e as any);
    }
    onToggle();
  };

  if (local.asChild) {
    return <Dynamic component={local.asChild} ref={setReference} onClick={handleClick} {...rest} />;
  }

  return (
    <button ref={setReference} onClick={handleClick} class={style(local.appearanceKey || 'dropdownTrigger')} {...rest}>
      {props.children}
    </button>
  );
};
