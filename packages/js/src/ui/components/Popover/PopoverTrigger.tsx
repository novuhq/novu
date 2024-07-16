import { JSX, splitProps } from 'solid-js';
import { AppearanceKey } from '../../context';
import { usePopover } from '.';
import { useStyle } from '../../helpers';

//TODO: Extend from buttonVariants() once added.
export const popoverTriggerVariants = () => 'nt-flex nt-justify-center nt-items-center';

type PopoverTriggerProps = JSX.IntrinsicElements['button'] & { appearanceKey?: AppearanceKey };
export const PopoverTrigger = (props: PopoverTriggerProps) => {
  const { setReference, onToggle } = usePopover();

  const style = useStyle();
  const [local, rest] = splitProps(props, ['appearanceKey', 'onClick']);

  return (
    // eslint-disable-next-line local-rules/no-class-without-style
    <button
      ref={setReference}
      onClick={(e) => {
        if (typeof local.onClick === 'function') {
          local.onClick(e);
        }
        onToggle();
      }}
      class={style(local.appearanceKey || 'dropdownTrigger', popoverTriggerVariants())}
      {...rest}
    >
      {props.children}
    </button>
  );
};
