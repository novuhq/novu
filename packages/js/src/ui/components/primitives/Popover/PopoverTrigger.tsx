import { createMemo, JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useStyle } from '../../../helpers';
import { mergeRefs } from '../../../helpers/mergeRefs';
import type { AllAppearanceKey } from '../../../types';
import { callButtonHandler } from '../asChild';
import { usePopover } from '.';

/**
 * What `Popover.Trigger` hands to the element that `asChild` renders in its place: the button props, plus
 * `aria-expanded` and `data-open` for the open state.
 */
export type PopoverTriggerChildProps = Omit<JSX.IntrinsicElements['button'], 'ref' | 'onClick'> & {
  ref: (el: HTMLButtonElement) => void;
  onClick: (e: MouseEvent) => void;
};

type PopoverTriggerProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AllAppearanceKey;
  asChild?: (props: PopoverTriggerChildProps) => JSX.Element;
};
export const PopoverTrigger = (props: PopoverTriggerProps) => {
  const { setReference, onToggle, open } = usePopover();

  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey', 'asChild', 'onClick', 'ref']);

  const handleClick = (e: MouseEvent) => {
    callButtonHandler(local.onClick, e);
    onToggle();
  };

  const ref = createMemo(() => (local.ref ? mergeRefs(setReference, local.ref) : setReference));

  if (local.asChild) {
    return (
      <Dynamic
        component={local.asChild}
        ref={ref()}
        onClick={handleClick}
        aria-expanded={open()}
        data-open={open()}
        {...rest}
      />
    );
  }

  return (
    <button
      ref={ref()}
      onClick={handleClick}
      class={style({ key: local.appearanceKey || 'dropdownTrigger' })}
      aria-expanded={open()}
      data-open={open()}
      {...rest}
    >
      {props.children}
    </button>
  );
};
