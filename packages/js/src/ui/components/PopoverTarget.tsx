import { ParentComponent } from 'solid-js';
import { useStyle } from '../helpers';
import { usePopover } from './Popover';

export const PopoverTarget: ParentComponent = (props) => {
  const { setTargetRef, onToggle } = usePopover();
  const style = useStyle();

  return (
    <button
      ref={setTargetRef}
      onClick={onToggle}
      class={style(
        `nt-h-6 nt-w-6 nt-flex nt-justify-center
         nt-items-center nt-rounded-md nt-relative
         hover:nt-bg-foreground-alpha-50
         nt-text-foreground-alpha-600 nt-outline-none`,
        'bellContainer'
      )}
    >
      {props.children}
    </button>
  );
};
