import { JSX, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { AppearanceKey } from '../../../types';
import { useStyle } from '../../../helpers';
import { useTooltip } from './TooltipRoot';

type PopoverTriggerProps = JSX.IntrinsicElements['button'] & {
  appearanceKey?: AppearanceKey;
  asChild?: (props: any) => JSX.Element;
};
export const TooltipTrigger = (props: PopoverTriggerProps) => {
  const { setReference, setOpen } = useTooltip();

  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey', 'asChild', 'onClick']);

  if (local.asChild) {
    return (
      <Dynamic
        component={local.asChild}
        ref={setReference}
        onMouseEnter={() => {
          setOpen(true);
        }}
        onMouseLeave={() => {
          setOpen(false);
        }}
        {...rest}
      />
    );
  }

  return (
    <button
      ref={setReference}
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
      class={style(local.appearanceKey || 'tooltipTrigger')}
      {...rest}
    >
      {props.children}
    </button>
  );
};
