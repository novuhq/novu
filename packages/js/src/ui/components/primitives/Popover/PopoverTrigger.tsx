import { createMemo, JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useStyle } from '../../../helpers';
import { mergeRefs } from '../../../helpers/mergeRefs';
import type { AppearanceKey } from '../../../types';
import { usePopover } from '.';

type PopoverTriggerProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AppearanceKey;
  asChild?: (props: any) => JSX.Element;
};
export const PopoverTrigger = (props: PopoverTriggerProps) => {
  const { setReference, onToggle } = usePopover();

  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey', 'asChild', 'onClick', 'ref']);

  const handleClick = (e: MouseEvent) => {
    if (typeof local.onClick === 'function') {
      local.onClick(e as any);
    }
    onToggle();
  };

  const ref = createMemo(() => (local.ref ? mergeRefs(setReference, local.ref) : setReference));

  if (local.asChild) {
    return <Dynamic component={local.asChild} ref={ref()} onClick={handleClick} {...rest} />;
  }

  return (
    <button
      ref={ref()}
      onClick={handleClick}
      class={style({ key: local.appearanceKey || 'dropdownTrigger' })}
      {...rest}
    >
      {props.children}
    </button>
  );
};
