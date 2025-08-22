import { createMemo, JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useStyle } from '../../../helpers';
import { mergeRefs } from '../../../helpers/mergeRefs';
import type { AppearanceKey } from '../../../types';
import { useTooltip } from './TooltipRoot';

type PopoverTriggerProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AppearanceKey;
  asChild?: (props: any) => JSX.Element;
};
export const TooltipTrigger = (props: PopoverTriggerProps) => {
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
    if (typeof local.onMouseEnter === 'function') {
      local.onMouseEnter(e as any);
    }
    setOpen(true);
  };

  const ref = createMemo(() => (local.ref ? mergeRefs(setReference, local.ref) : setReference));

  const handleMouseLeave = (e: MouseEvent) => {
    if (typeof local.onMouseLeave === 'function') {
      local.onMouseLeave(e as any);
    }
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
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
      class={style({ key: local.appearanceKey || 'tooltipTrigger' })}
      {...rest}
    >
      {props.children}
    </button>
  );
};
