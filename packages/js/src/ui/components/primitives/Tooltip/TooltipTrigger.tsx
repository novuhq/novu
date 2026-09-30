import { createMemo, JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useStyle } from '../../../helpers';
import { mergeRefs } from '../../../helpers/mergeRefs';
import type { AllAppearanceKey } from '../../../types';
import { callButtonHandler } from '../asChild';
import { useTooltip } from './TooltipRoot';

/** What `Tooltip.Trigger` hands to the element that `asChild` renders in its place. */
export type TooltipTriggerChildProps = Omit<
  JSX.IntrinsicElements['button'],
  'ref' | 'onClick' | 'onMouseEnter' | 'onMouseLeave'
> & {
  ref: (el: HTMLButtonElement) => void;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: (e: MouseEvent) => void;
};

type TooltipTriggerProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AllAppearanceKey;
  asChild?: (props: TooltipTriggerChildProps) => JSX.Element;
};
export const TooltipTrigger = (props: TooltipTriggerProps) => {
  const { setReference, setOpen } = useTooltip();

  const style = useStyle();
  const [local, rest] = splitProps(props, [
    'appearanceKey',
    'asChild',
    'onClick',
    'onMouseEnter',
    'onMouseLeave',
    'ref',
  ]);

  const handleMouseEnter = (e: MouseEvent) => {
    callButtonHandler(local.onMouseEnter, e);
    setOpen(true);
  };

  const ref = createMemo(() => (local.ref ? mergeRefs(setReference, local.ref) : setReference));

  const handleMouseLeave = (e: MouseEvent) => {
    callButtonHandler(local.onMouseLeave, e);
    setOpen(false);
  };

  if (local.asChild) {
    return (
      <Dynamic
        component={local.asChild}
        ref={ref()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...rest}
      />
    );
  }

  return (
    <button
      ref={ref()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      class={style({ key: local.appearanceKey || 'tooltipTrigger' })}
      {...rest}
    >
      {props.children}
    </button>
  );
};
